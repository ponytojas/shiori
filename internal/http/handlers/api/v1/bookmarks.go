package api_v1

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"github.com/go-shiori/shiori/internal/http/middleware"
	"github.com/go-shiori/shiori/internal/http/response"
	"github.com/go-shiori/shiori/internal/model"
)

type updateCachePayload struct {
	Ids           []int `json:"ids"   `
	KeepMetadata  bool  `json:"keep_metadata"`
	CreateArchive bool  `json:"create_archive"`
	CreateEbook   bool  `json:"create_ebook"`
	SkipExist     bool  `json:"skip_exist"`
}

func (p *updateCachePayload) IsValid() error {
	if len(p.Ids) == 0 {
		return fmt.Errorf("id should not be empty")
	}
	for _, id := range p.Ids {
		if id <= 0 {
			return fmt.Errorf("id should not be 0 or negative")
		}
	}
	return nil
}

type readableResponseMessage struct {
	Content string `json:"content"`
	HTML    string `json:"html"`
}

type createShortcutBookmarkPayload struct {
	URL   string   `json:"url"`
	Title string   `json:"title"`
	Tags  []string `json:"tags"`
}

func (p *createShortcutBookmarkPayload) IsValid() error {
	if strings.TrimSpace(p.URL) == "" {
		return fmt.Errorf("url should not be empty")
	}

	parsedURL, err := url.ParseRequestURI(p.URL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return fmt.Errorf("url should be a valid absolute URL")
	}

	return nil
}

// HandleCreateShortcutBookmark creates bookmark from minimal payload, intended for
// automation clients (e.g. iPhone Shortcuts). By default this endpoint requires JWT.
// If SHIORI_HTTP_ALLOW_HEADER_ONLY_SHORTCUT_AUTH is enabled, a valid control header
// can be used instead of JWT for this endpoint only.
func HandleCreateShortcutBookmark(deps model.Dependencies, c model.WebContext) {
	if !c.UserIsLogged() && !middleware.AllowHeaderOnlyShortcutAuth(deps, c) {
		response.SendError(c, http.StatusUnauthorized, "Authentication required")
		return
	}

	var payload createShortcutBookmarkPayload
	if err := json.NewDecoder(c.Request().Body).Decode(&payload); err != nil {
		response.SendError(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := payload.IsValid(); err != nil {
		response.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	bookmark := model.BookmarkDTO{
		URL:   strings.TrimSpace(payload.URL),
		Title: strings.TrimSpace(payload.Title),
		Tags:  []model.TagDTO{},
	}
	if bookmark.Title == "" {
		bookmark.Title = bookmark.URL
	}

	savedBookmarks, err := deps.Database().SaveBookmarks(c.Request().Context(), true, bookmark)
	if err != nil {
		if errors.Is(err, model.ErrAlreadyExists) {
			response.SendError(c, http.StatusConflict, "Bookmark already exists")
			return
		}
		response.SendError(c, http.StatusInternalServerError, "Failed to save bookmark")
		return
	}

	if len(savedBookmarks) == 0 {
		response.SendError(c, http.StatusInternalServerError, "Failed to save bookmark")
		return
	}

	saved := savedBookmarks[0]
	for _, tagName := range payload.Tags {
		tagName = strings.TrimSpace(tagName)
		if tagName == "" {
			continue
		}

		tagDTO, err := deps.Domains().Tags().CreateTag(c.Request().Context(), model.TagDTO{Tag: model.Tag{Name: tagName}})
		if err != nil {
			if errors.Is(err, model.ErrAlreadyExists) {
				tags, getErr := deps.Domains().Tags().ListTags(c.Request().Context(), model.ListTagsOptions{Search: tagName})
				if getErr != nil {
					response.SendError(c, http.StatusInternalServerError, "Failed to resolve tag")
					return
				}

				for _, tag := range tags {
					if tag.Name == tagName {
						tagDTO = tag
						break
					}
				}
			}
		}

		if tagDTO.ID <= 0 {
			response.SendError(c, http.StatusInternalServerError, "Failed to create tag")
			return
		}

		if err = deps.Domains().Bookmarks().AddTagToBookmark(c.Request().Context(), saved.ID, tagDTO.ID); err != nil {
			response.SendError(c, http.StatusInternalServerError, "Failed to assign tag")
			return
		}

		saved.Tags = append(saved.Tags, tagDTO)
	}

	response.SendJSON(c, http.StatusCreated, saved)
}

// HandleBookmarkReadable returns the readable version of a bookmark
//
//	@Summary					Get readable version of bookmark.
//	@Tags						Auth
//	@securityDefinitions.apikey	ApiKeyAuth
//	@Produce					json
//	@Success					200	{object}	readableResponseMessage
//	@Failure					403	{object}	nil	"Token not provided/invalid"
//	@Router						/api/v1/bookmarks/id/readable [get]
func HandleBookmarkReadable(deps model.Dependencies, c model.WebContext) {
	if err := middleware.RequireLoggedInUser(deps, c); err != nil {
		response.SendError(c, http.StatusForbidden, err.Error())
		return
	}

	bookmarkID, err := strconv.Atoi(c.Request().PathValue("id"))
	if err != nil {
		response.SendError(c, http.StatusBadRequest, "Invalid bookmark ID")
		return
	}

	bookmark, err := deps.Domains().Bookmarks().GetBookmark(c.Request().Context(), model.DBID(bookmarkID))
	if err != nil {
		response.SendError(c, http.StatusNotFound, "Bookmark not found")
		return
	}

	response.SendJSON(c, http.StatusOK, readableResponseMessage{
		Content: bookmark.Content,
		HTML:    bookmark.HTML,
	})
}

// HandleUpdateCache updates the cache and ebook for bookmarks
//
//	@Summary					Update Cache and Ebook on server.
//	@Tags						Auth
//	@securityDefinitions.apikey	ApiKeyAuth
//	@Param						payload	body	updateCachePayload	true	"Update Cache Payload"
//	@Produce					json
//	@Success					200	{object}	model.BookmarkDTO
//	@Failure					403	{object}	nil	"Token not provided/invalid"
//	@Router						/api/v1/bookmarks/cache [put]
func HandleUpdateCache(deps model.Dependencies, c model.WebContext) {
	if err := middleware.RequireLoggedInAdmin(deps, c); err != nil {
		response.SendError(c, http.StatusForbidden, err.Error())
		return
	}

	// Parse request payload
	var payload updateCachePayload
	if err := json.NewDecoder(c.Request().Body).Decode(&payload); err != nil {
		response.SendError(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := payload.IsValid(); err != nil {
		response.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Get bookmarks from database
	bookmarks, err := deps.Domains().Bookmarks().GetBookmarks(c.Request().Context(), payload.Ids)
	if err != nil {
		response.SendError(c, http.StatusInternalServerError, "Failed to get bookmarks")
		return
	}

	if len(bookmarks) == 0 {
		response.SendError(c, http.StatusNotFound, "No bookmarks found")
		return
	}

	// Process bookmarks concurrently
	mx := sync.RWMutex{}
	wg := sync.WaitGroup{}
	semaphore := make(chan struct{}, 10)

	for i, book := range bookmarks {
		wg.Add(1)

		book.CreateArchive = payload.CreateArchive
		book.CreateEbook = payload.CreateEbook

		go func(i int, book model.BookmarkDTO) {
			defer wg.Done()
			defer func() { <-semaphore }()
			semaphore <- struct{}{}

			// Download and process bookmark
			updatedBook, err := deps.Domains().Bookmarks().UpdateBookmarkCache(c.Request().Context(), book, payload.KeepMetadata, payload.SkipExist)
			if err != nil {
				deps.Logger().Error("error updating bookmark cache", "error", err)
				return
			}

			mx.Lock()
			bookmarks[i] = *updatedBook
			mx.Unlock()
		}(i, book)
	}

	wg.Wait()

	response.SendJSON(c, http.StatusOK, bookmarks)
}

type bulkUpdateBookmarkTagsPayload struct {
	BookmarkIDs []int `json:"bookmark_ids"`
	TagIDs      []int `json:"tag_ids"`
}

func (p *bulkUpdateBookmarkTagsPayload) IsValid() error {
	if len(p.BookmarkIDs) == 0 {
		return fmt.Errorf("bookmark_ids should not be empty")
	}
	if len(p.TagIDs) == 0 {
		return fmt.Errorf("tag_ids should not be empty")
	}
	return nil
}

// HandleGetBookmarkTags gets the tags for a bookmark
//
//	@Summary					Get tags for a bookmark.
//	@Tags						Auth
//	@securityDefinitions.apikey	ApiKeyAuth
//	@Produce					json
//	@Param						id	path		int	true	"Bookmark ID"
//	@Success					200	{array}		model.TagDTO
//	@Failure					403	{object}	nil	"Token not provided/invalid"
//	@Failure					404	{object}	nil	"Bookmark not found"
//	@Router						/api/v1/bookmarks/{id}/tags [get]
func HandleGetBookmarkTags(deps model.Dependencies, c model.WebContext) {
	if err := middleware.RequireLoggedInUser(deps, c); err != nil {
		response.SendError(c, http.StatusForbidden, err.Error())
		return
	}

	bookmarkID, err := strconv.Atoi(c.Request().PathValue("id"))
	if err != nil {
		response.SendError(c, http.StatusBadRequest, "Invalid bookmark ID")
		return
	}

	// Check if bookmark exists
	exists, err := deps.Domains().Bookmarks().BookmarkExists(c.Request().Context(), bookmarkID)
	if err != nil {
		response.SendError(c, http.StatusInternalServerError, "Failed to check if bookmark exists")
		return
	}
	if !exists {
		response.SendError(c, http.StatusNotFound, "Bookmark not found")
		return
	}

	// Get bookmark to retrieve its tags
	tags, err := deps.Domains().Tags().ListTags(c.Request().Context(), model.ListTagsOptions{
		BookmarkID: bookmarkID,
	})
	if err != nil {
		response.SendError(c, http.StatusInternalServerError, "Failed to get bookmark tags")
		return
	}

	response.SendJSON(c, http.StatusOK, tags)
}

// bookmarkTagPayload is used for both adding and removing tags from bookmarks
type bookmarkTagPayload struct {
	TagID int `json:"tag_id"`
}

func (p *bookmarkTagPayload) IsValid() error {
	if p.TagID <= 0 {
		return fmt.Errorf("tag_id should be a positive integer")
	}
	return nil
}

// HandleAddTagToBookmark adds a tag to a bookmark
//
//	@Summary					Add a tag to a bookmark.
//	@Tags						Auth
//	@securityDefinitions.apikey	ApiKeyAuth
//	@Param						id		path	int					true	"Bookmark ID"
//	@Param						payload	body	bookmarkTagPayload	true	"Add Tag Payload"
//	@Produce					json
//	@Success					200	{object}	nil
//	@Failure					403	{object}	nil	"Token not provided/invalid"
//	@Failure					404	{object}	nil	"Bookmark or tag not found"
//	@Router						/api/v1/bookmarks/{id}/tags [post]
func HandleAddTagToBookmark(deps model.Dependencies, c model.WebContext) {
	if err := middleware.RequireLoggedInAdmin(deps, c); err != nil {
		response.SendError(c, http.StatusForbidden, err.Error())
		return
	}

	bookmarkID, err := strconv.Atoi(c.Request().PathValue("id"))
	if err != nil {
		response.SendError(c, http.StatusBadRequest, "Invalid bookmark ID")
		return
	}

	// Parse request payload
	var payload bookmarkTagPayload
	if err := json.NewDecoder(c.Request().Body).Decode(&payload); err != nil {
		response.SendError(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := payload.IsValid(); err != nil {
		response.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Add tag to bookmark
	err = deps.Domains().Bookmarks().AddTagToBookmark(c.Request().Context(), bookmarkID, payload.TagID)
	if err != nil {
		if errors.Is(err, model.ErrBookmarkNotFound) {
			response.SendError(c, http.StatusNotFound, "Bookmark not found")
			return
		}
		if errors.Is(err, model.ErrTagNotFound) {
			response.SendError(c, http.StatusNotFound, "Tag not found")
			return
		}
		response.SendError(c, http.StatusInternalServerError, "Failed to add tag to bookmark")
		return
	}

	response.SendJSON(c, http.StatusCreated, nil)
}

// HandleRemoveTagFromBookmark removes a tag from a bookmark
//
//	@Summary					Remove a tag from a bookmark.
//	@Tags						Auth
//	@securityDefinitions.apikey	ApiKeyAuth
//	@Param						id		path	int					true	"Bookmark ID"
//	@Param						payload	body	bookmarkTagPayload	true	"Remove Tag Payload"
//	@Produce					json
//	@Success					200	{object}	nil
//	@Failure					403	{object}	nil	"Token not provided/invalid"
//	@Failure					404	{object}	nil	"Bookmark not found"
//	@Router						/api/v1/bookmarks/{id}/tags [delete]
func HandleRemoveTagFromBookmark(deps model.Dependencies, c model.WebContext) {
	if err := middleware.RequireLoggedInUser(deps, c); err != nil {
		response.SendError(c, http.StatusForbidden, err.Error())
		return
	}

	bookmarkID, err := strconv.Atoi(c.Request().PathValue("id"))
	if err != nil {
		response.SendError(c, http.StatusBadRequest, "Invalid bookmark ID")
		return
	}

	// Parse request payload
	var payload bookmarkTagPayload
	if err := json.NewDecoder(c.Request().Body).Decode(&payload); err != nil {
		response.SendError(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := payload.IsValid(); err != nil {
		response.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Remove tag from bookmark
	err = deps.Domains().Bookmarks().RemoveTagFromBookmark(c.Request().Context(), bookmarkID, payload.TagID)
	if err != nil {
		if errors.Is(err, model.ErrBookmarkNotFound) {
			response.SendError(c, http.StatusNotFound, "Bookmark not found")
			return
		}
		if errors.Is(err, model.ErrTagNotFound) {
			response.SendError(c, http.StatusNotFound, "Tag not found")
			return
		}
		response.SendError(c, http.StatusInternalServerError, "Failed to remove tag from bookmark")
		return
	}

	response.SendJSON(c, http.StatusOK, nil)
}

// HandleBulkUpdateBookmarkTags updates the tags for multiple bookmarks
//
//	@Summary					Bulk update tags for multiple bookmarks.
//	@Tags						Auth
//	@securityDefinitions.apikey	ApiKeyAuth
//	@Param						payload	body	bulkUpdateBookmarkTagsPayload	true	"Bulk Update Bookmark Tags Payload"
//	@Produce					json
//	@Success					200	{object}	[]model.BookmarkDTO
//	@Failure					403	{object}	nil	"Token not provided/invalid"
//	@Failure					400	{object}	nil	"Invalid request payload"
//	@Failure					404	{object}	nil	"No bookmarks found"
//	@Router						/api/v1/bookmarks/bulk/tags [put]
func HandleBulkUpdateBookmarkTags(deps model.Dependencies, c model.WebContext) {
	if err := middleware.RequireLoggedInUser(deps, c); err != nil {
		response.SendError(c, http.StatusForbidden, err.Error())
		return
	}

	// Parse request payload
	var payload bulkUpdateBookmarkTagsPayload
	if err := json.NewDecoder(c.Request().Body).Decode(&payload); err != nil {
		response.SendError(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := payload.IsValid(); err != nil {
		response.SendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Use the domain method to update bookmark tags
	err := deps.Domains().Bookmarks().BulkUpdateBookmarkTags(c.Request().Context(), payload.BookmarkIDs, payload.TagIDs)
	if err != nil {
		if errors.Is(err, model.ErrBookmarkNotFound) {
			response.SendError(c, http.StatusNotFound, "No bookmarks found")
			return
		}
		response.SendError(c, http.StatusInternalServerError, "Failed to update bookmarks")
		return
	}

	response.SendJSON(c, http.StatusOK, nil)
}

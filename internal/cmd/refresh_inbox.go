package cmd

import (
	"sort"
	"strings"
	"time"

	"github.com/go-shiori/shiori/internal/model"
	"github.com/spf13/cobra"
)

var operationalWorkflowTags = map[string]struct{}{
	"leer-hoy":    {},
	"rapido":      {},
	"foco":        {},
	"inspiracion": {},
}

func refreshInboxCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "refresh-inbox",
		Short: "Refresh inbox metadata and workflow tags",
		Long:  "Refresh bookmark metadata from the source URL and recalculate the workflow tags used by the web Inbox.",
		Run:   refreshInboxHandler,
	}

	cmd.Flags().Bool("skip-metadata", false, "Skip metadata refresh and only recalculate workflow tags")
	cmd.Flags().Bool("with-archival", false, "Refresh offline archives while updating metadata")
	cmd.Flags().Int("limit", 0, "Limit how many non-archived bookmarks are processed")

	return cmd
}

func refreshInboxHandler(cmd *cobra.Command, args []string) {
	_, deps := initShiori(cmd.Context(), cmd)

	skipMetadata, _ := cmd.Flags().GetBool("skip-metadata")
	withArchival, _ := cmd.Flags().GetBool("with-archival")
	limit, _ := cmd.Flags().GetInt("limit")

	bookmarks, err := deps.Database().GetBookmarks(cmd.Context(), model.DBGetBookmarksOptions{
		ExcludedTags: []string{"archive"},
		OrderMethod:  model.ByLastAdded,
		Limit:        limit,
		WithContent:  true,
	})
	if err != nil {
		cError.Printf("Failed to get bookmarks: %v\n", err)
		return
	}

	if len(bookmarks) == 0 {
		cInfo.Println("No non-archived bookmarks found")
		return
	}

	processed := make([]model.BookmarkDTO, 0, len(bookmarks))
	now := time.Now().UTC()

	for _, book := range bookmarks {
		updated := book

		if !skipMetadata {
			updated.CreateArchive = withArchival
			updated.CreateEbook = false

			refreshed, err := deps.Domains().Bookmarks().UpdateBookmarkCache(cmd.Context(), updated, false, true)
			if err != nil {
				deps.Logger().WithError(err).Warnf("failed to refresh metadata for bookmark %d", book.ID)
			} else {
				updated = *refreshed
			}
		}

		updated.Tags = mergeWorkflowTags(updated.Tags, classifyWorkflowTags(updated, now))
		processed = append(processed, updated)
	}

	if _, err := deps.Database().SaveBookmarks(cmd.Context(), false, processed...); err != nil {
		cError.Printf("Failed to save refreshed bookmarks: %v\n", err)
		return
	}

	cInfo.Printf("Refreshed %d bookmark(s)\n", len(processed))
}

func classifyWorkflowTags(bookmark model.BookmarkDTO, now time.Time) []string {
	text := strings.ToLower(strings.Join([]string{
		bookmark.Title,
		bookmark.Excerpt,
		bookmark.Content,
	}, " "))

	quickScore := scoreMatches(text,
		"quick", "brief", "roundup", "digest", "summary", "summaries", "thread", "links",
		"news", "announcement", "announcing", "release", "changelog", "update", "tips",
	)
	focusScore := scoreMatches(text,
		"guide", "tutorial", "deep dive", "deep-dive", "architecture", "spec", "standard",
		"reference", "manual", "research", "paper", "whitepaper", "benchmark", "analysis", "course",
	)
	inspirationScore := scoreMatches(text,
		"inspiration", "inspiring", "ideas", "showcase", "gallery", "design", "creative",
		"patterns", "portfolio", "case study", "vision", "concept",
	)

	wordCount := len(strings.Fields(text))
	switch {
	case wordCount >= 2200:
		focusScore += 4
	case wordCount >= 900:
		focusScore += 2
	case wordCount > 0 && wordCount <= 400:
		quickScore += 2
	}

	if looksLikeVideoURL(bookmark.URL) {
		quickScore++
		inspirationScore++
	}

	selected := ""
	highest := 0
	for _, candidate := range []struct {
		tag   string
		score int
	}{
		{tag: "rapido", score: quickScore},
		{tag: "foco", score: focusScore},
		{tag: "inspiracion", score: inspirationScore},
	} {
		if candidate.score > highest {
			selected = candidate.tag
			highest = candidate.score
		}
	}

	result := make([]string, 0, 2)
	if selected != "" {
		result = append(result, selected)
	}

	if shouldTagForToday(bookmark, now, selected, quickScore, focusScore, inspirationScore) {
		result = append(result, "leer-hoy")
	}

	sort.Strings(result)
	return result
}

func mergeWorkflowTags(existing []model.TagDTO, nextWorkflowTags []string) []model.TagDTO {
	nextSet := make(map[string]struct{}, len(nextWorkflowTags))
	for _, tagName := range nextWorkflowTags {
		nextSet[tagName] = struct{}{}
	}

	merged := make([]model.TagDTO, 0, len(existing)+len(nextWorkflowTags))
	existingWorkflow := make(map[string]model.TagDTO)

	for _, tag := range existing {
		normalized := normalizeTagName(tag.Name)
		if _, isWorkflow := operationalWorkflowTags[normalized]; isWorkflow {
			existingWorkflow[normalized] = tag
			continue
		}

		merged = append(merged, tag)
	}

	for name, tag := range existingWorkflow {
		if _, keep := nextSet[name]; keep {
			tag.Deleted = false
			tag.Name = name
			merged = append(merged, tag)
			delete(nextSet, name)
			continue
		}

		tag.Deleted = true
		tag.Name = name
		merged = append(merged, tag)
	}

	for name := range nextSet {
		merged = append(merged, model.TagDTO{
			Tag: model.Tag{
				Name: name,
			},
		})
	}

	sort.SliceStable(merged, func(i, j int) bool {
		return normalizeTagName(merged[i].Name) < normalizeTagName(merged[j].Name)
	})

	return merged
}

func shouldTagForToday(bookmark model.BookmarkDTO, now time.Time, selected string, quickScore, focusScore, inspirationScore int) bool {
	if selected == "rapido" && quickScore >= 2 {
		return true
	}

	if quickScore == 0 && focusScore == 0 && inspirationScore == 0 {
		return isRecentBookmark(bookmark, now, 48*time.Hour)
	}

	return isRecentBookmark(bookmark, now, 72*time.Hour)
}

func isRecentBookmark(bookmark model.BookmarkDTO, now time.Time, maxAge time.Duration) bool {
	timestamps := []string{bookmark.ModifiedAt, bookmark.CreatedAt}
	for _, raw := range timestamps {
		if raw == "" {
			continue
		}

		parsed, err := time.ParseInLocation(model.DatabaseDateFormat, raw, time.UTC)
		if err != nil {
			continue
		}

		if now.Sub(parsed.UTC()) <= maxAge {
			return true
		}
	}

	return false
}

func looksLikeVideoURL(rawURL string) bool {
	normalized := strings.ToLower(rawURL)
	return strings.Contains(normalized, "youtube.com") ||
		strings.Contains(normalized, "youtu.be") ||
		strings.Contains(normalized, "vimeo.com") ||
		strings.Contains(normalized, "loom.com")
}

func scoreMatches(text string, terms ...string) int {
	score := 0
	for _, term := range terms {
		if strings.Contains(text, term) {
			score++
		}
	}
	return score
}

func normalizeTagName(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(value), " "))
}

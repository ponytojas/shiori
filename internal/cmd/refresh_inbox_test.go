package cmd

import (
	"testing"
	"time"

	"github.com/go-shiori/shiori/internal/model"
	"github.com/stretchr/testify/assert"
)

func TestClassifyWorkflowTags(t *testing.T) {
	now := time.Date(2026, time.March, 20, 12, 0, 0, 0, time.UTC)

	t.Run("marks quick recent bookmarks for today", func(t *testing.T) {
		tags := classifyWorkflowTags(model.BookmarkDTO{
			Title:      "Quick release notes roundup",
			Excerpt:    "A brief digest of product updates.",
			CreatedAt:  "2026-03-20 08:00:00",
			ModifiedAt: "2026-03-20 08:00:00",
		}, now)

		assert.Equal(t, []string{"read-today", "quickRead"}, tags)
	})

	t.Run("marks long technical content as focus", func(t *testing.T) {
		tags := classifyWorkflowTags(model.BookmarkDTO{
			Title:      "Architecture guide for distributed systems",
			Excerpt:    "A deep dive tutorial with benchmarks and reference notes.",
			Content:    repeatWords("analysis", 2500),
			CreatedAt:  "2026-03-10 08:00:00",
			ModifiedAt: "2026-03-10 08:00:00",
		}, now)

		assert.Equal(t, []string{"focus"}, tags)
	})

	t.Run("marks design showcases as inspiration", func(t *testing.T) {
		tags := classifyWorkflowTags(model.BookmarkDTO{
			Title:      "Design showcase and creative inspiration gallery",
			Excerpt:    "A portfolio of visual patterns and concepts.",
			CreatedAt:  "2026-03-18 08:00:00",
			ModifiedAt: "2026-03-18 08:00:00",
		}, now)

		assert.Equal(t, []string{"inspiration", "read-today"}, tags)
	})
}

func TestMergeWorkflowTags(t *testing.T) {
	existing := []model.TagDTO{
		{Tag: model.Tag{ID: 1, Name: "personal"}},
		{Tag: model.Tag{ID: 2, Name: "read-today"}},
		{Tag: model.Tag{ID: 3, Name: "quickRead"}},
	}

	merged := mergeWorkflowTags(existing, []string{"focus"})

	assert.Contains(t, merged, model.TagDTO{Tag: model.Tag{ID: 1, Name: "personal"}})
	assert.Contains(t, merged, model.TagDTO{Tag: model.Tag{ID: 2, Name: "read-today"}, Deleted: true})
	assert.Contains(t, merged, model.TagDTO{Tag: model.Tag{ID: 3, Name: "quickRead"}, Deleted: true})
	assert.Contains(t, merged, model.TagDTO{Tag: model.Tag{Name: "focus"}})
}

func repeatWords(word string, count int) string {
	result := ""
	for i := 0; i < count; i++ {
		if i > 0 {
			result += " "
		}
		result += word
	}
	return result
}

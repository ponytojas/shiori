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

		assert.Equal(t, []string{"leer-hoy", "rapido"}, tags)
	})

	t.Run("marks long technical content as focus", func(t *testing.T) {
		tags := classifyWorkflowTags(model.BookmarkDTO{
			Title:      "Architecture guide for distributed systems",
			Excerpt:    "A deep dive tutorial with benchmarks and reference notes.",
			Content:    repeatWords("analysis", 2500),
			CreatedAt:  "2026-03-10 08:00:00",
			ModifiedAt: "2026-03-10 08:00:00",
		}, now)

		assert.Equal(t, []string{"foco"}, tags)
	})

	t.Run("marks design showcases as inspiration", func(t *testing.T) {
		tags := classifyWorkflowTags(model.BookmarkDTO{
			Title:      "Design showcase and creative inspiration gallery",
			Excerpt:    "A portfolio of visual patterns and concepts.",
			CreatedAt:  "2026-03-18 08:00:00",
			ModifiedAt: "2026-03-18 08:00:00",
		}, now)

		assert.Equal(t, []string{"inspiracion", "leer-hoy"}, tags)
	})
}

func TestMergeWorkflowTags(t *testing.T) {
	existing := []model.TagDTO{
		{Tag: model.Tag{ID: 1, Name: "personal"}},
		{Tag: model.Tag{ID: 2, Name: "leer-hoy"}},
		{Tag: model.Tag{ID: 3, Name: "rapido"}},
	}

	merged := mergeWorkflowTags(existing, []string{"foco"})

	assert.Contains(t, merged, model.TagDTO{Tag: model.Tag{ID: 1, Name: "personal"}})
	assert.Contains(t, merged, model.TagDTO{Tag: model.Tag{ID: 2, Name: "leer-hoy"}, Deleted: true})
	assert.Contains(t, merged, model.TagDTO{Tag: model.Tag{ID: 3, Name: "rapido"}, Deleted: true})
	assert.Contains(t, merged, model.TagDTO{Tag: model.Tag{Name: "foco"}})
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

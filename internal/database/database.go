package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/url"
	"strings"

	"github.com/go-shiori/shiori/internal/model"
	"github.com/huandu/go-sqlbuilder"
	"github.com/jmoiron/sqlx"
)

// Connect connects to database based on submitted database URL.
func Connect(ctx context.Context, dbURL string) (model.DB, error) {
	dbU, err := url.Parse(dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	switch dbU.Scheme {
	case "mysql":
		urlNoSchema := strings.Split(dbURL, "://")[1]
		return OpenMySQLDatabase(ctx, urlNoSchema)
	case "postgres":
		return OpenPGDatabase(ctx, dbURL)
	case "sqlite":
		return OpenSQLiteDatabase(ctx, dbU.Path[1:])
	}

	return nil, fmt.Errorf("unsupported database scheme: %s", dbU.Scheme)
}

type dbbase struct {
	flavor sqlbuilder.Flavor
	reader *sqlx.DB
	writer *sqlx.DB
}

func (db *dbbase) Flavor() sqlbuilder.Flavor {
	return db.flavor
}

func (db *dbbase) ReaderDB() *sqlx.DB {
	return db.reader
}

func (db *dbbase) WriterDB() *sqlx.DB {
	return db.writer
}

func (db *dbbase) withTx(ctx context.Context, fn func(tx *sqlx.Tx) error) (err error) {
	tx, err := db.writer.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				slog.Error("error during rollback", "error", rbErr)
			}
		}
	}()

	if err = fn(tx); err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

func (db *dbbase) GetContext(ctx context.Context, dest any, query string, args ...any) error {
	return db.reader.GetContext(ctx, dest, query, args...)
}

// Deprecated: Use SelectContext instead.
func (db *dbbase) Select(dest any, query string, args ...any) error {
	return db.reader.Select(dest, query, args...)
}

func (db *dbbase) SelectContext(ctx context.Context, dest any, query string, args ...any) error {
	return db.reader.SelectContext(ctx, dest, query, args...)
}

func (db *dbbase) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return db.writer.ExecContext(ctx, query, args...)
}

func (db *dbbase) MustBegin() *sqlx.Tx {
	return db.writer.MustBegin()
}

func NewDBBase(reader, writer *sqlx.DB, flavor sqlbuilder.Flavor) dbbase {
	return dbbase{
		reader: reader,
		writer: writer,
		flavor: flavor,
	}
}

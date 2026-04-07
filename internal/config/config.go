package config

import (
	"bufio"
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofrs/uuid/v5"
	"github.com/sethvargo/go-envconfig"
)

// readDotEnv reads the configuration from variables in a .env file (only for contributing)
func readDotEnv(logger *slog.Logger) map[string]string {
	result := make(map[string]string)

	file, err := os.Open(".env")
	if err != nil {
		return result
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "#") {
			continue
		}

		keyval := strings.SplitN(line, "=", 2)
		if len(keyval) != 2 {
			logger.Warn("invalid line in .env file", "line", line)
			continue
		}

		result[keyval[0]] = keyval[1]
	}

	if err := scanner.Err(); err != nil {
		logger.Error("error reading dotenv", "error", err)
		os.Exit(1)
	}

	return result
}

type HttpConfig struct {
	Enabled      bool   `env:"HTTP_ENABLED,default=True"`
	Port         int    `env:"HTTP_PORT,default=8080"`
	Address      string `env:"HTTP_ADDRESS,default=:"`
	RootPath     string `env:"HTTP_ROOT_PATH,default=/"`
	AccessLog    bool   `env:"HTTP_ACCESS_LOG,default=True"`
	ServeWebUI bool `env:"HTTP_SERVE_WEB_UI,default=True"`
	ServeSwagger bool   `env:"HTTP_SERVE_SWAGGER,default=False"`
	SecretKey    []byte `env:"HTTP_SECRET_KEY"`

	AdminUser string `env:"ADMIN_USER,default=shiori"`
	AdminPass string `env:"ADMIN_PASS,default=gopher"`

	ControlHeaderName  string `env:"CONTROL_HEADER_NAME,default="`
	ControlHeaderValue string `env:"CONTROL_HEADER_VALUE,default="`
	// Fiber Specific
	BodyLimit                    int           `env:"HTTP_BODY_LIMIT,default=1024"`
	ReadTimeout                  time.Duration `env:"HTTP_READ_TIMEOUT,default=10s"`
	WriteTimeout                 time.Duration `env:"HTTP_WRITE_TIMEOUT,default=10s"`
	IDLETimeout                  time.Duration `env:"HTTP_IDLE_TIMEOUT,default=10s"`
	DisableKeepAlive             bool          `env:"HTTP_DISABLE_KEEP_ALIVE,default=true"`
	DisablePreParseMultipartForm bool          `env:"HTTP_DISABLE_PARSE_MULTIPART_FORM,default=true"`

	SSOProxyAuth           bool     `env:"SSO_PROXY_AUTH_ENABLED,default=false"`
	SSOProxyAuthHeaderName string   `env:"SSO_PROXY_AUTH_HEADER_NAME,default=Remote-User"`
	SSOProxyAuthTrusted    []string `env:"SSO_PROXY_AUTH_TRUSTED,default=10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7"`

	AllowHeaderOnlyShortcutAuth bool `env:"HTTP_ALLOW_HEADER_ONLY_SHORTCUT_AUTH,default=False"`
}

// SetDefaults sets the default values for the configuration
func (c *HttpConfig) SetDefaults(logger *slog.Logger) {
	// Set a random secret key if not set
	if len(c.SecretKey) == 0 {
		logger.Warn("SHIORI_HTTP_SECRET_KEY is not set, using random value. This means that all sessions will be invalidated on server restart.")
		randomUUID, err := uuid.NewV4()
		if err != nil {
			logger.Error("couldn't generate a random UUID", "error", err)
			os.Exit(1)
		}
		c.SecretKey = []byte(randomUUID.String())
	}
}

func (c *HttpConfig) IsValid() error {
	if !strings.HasSuffix(c.RootPath, "/") {
		return fmt.Errorf("root path should end with a slash")
	}

	return nil
}

type DatabaseConfig struct {
	DBMS string `env:"DBMS"` // Deprecated
	// DBMS requires more environment variables. Check the database package for more information.
	URL string `env:"DATABASE_URL"`
}

type StorageConfig struct {
	DataDir string `env:"DIR"` // Using DIR to be backwards compatible with the old config
}

type Config struct {
	Hostname    string `env:"HOSTNAME,required"`
	Development bool   `env:"DEVELOPMENT,default=False"`
	LogLevel    string // Set only from the CLI flag
	Database    *DatabaseConfig
	Storage     *StorageConfig
	Http        *HttpConfig
}

// SetDefaults sets the default values for the configuration
func (c Config) SetDefaults(logger *slog.Logger, portableMode bool) {
	// Set the default storage directory if not set, setting also the database url for
	// sqlite3 if that engine is used
	if c.Storage.DataDir == "" {
		var err error
		c.Storage.DataDir, err = getStorageDirectory(portableMode)
		if err != nil {
			logger.Error("couldn't determine the data directory", "error", err)
			os.Exit(1)
		}
	}

	// Set default database url if not set
	if c.Database.DBMS == "" && c.Database.URL == "" {
		c.Database.URL = fmt.Sprintf("sqlite:///%s?_txlock=immediate", filepath.Join(c.Storage.DataDir, "shiori.db"))
	}

	c.Http.SetDefaults(logger)
}

func (c *Config) DebugConfiguration(logger *slog.Logger) {
	logger.Debug("configuration",
		"hostname", c.Hostname,
		"development", c.Development,
		"database_url", c.Database.URL,
		"dbms", c.Database.DBMS,
		"dir", c.Storage.DataDir,
		"http_enabled", c.Http.Enabled,
		"http_port", c.Http.Port,
		"http_address", c.Http.Address,
		"http_root_path", c.Http.RootPath,
		"http_access_log", c.Http.AccessLog,
		"http_serve_web_ui", c.Http.ServeWebUI,
		"http_secret_key_len", len(c.Http.SecretKey),
		"http_body_limit", c.Http.BodyLimit,
		"http_read_timeout", c.Http.ReadTimeout,
		"http_write_timeout", c.Http.WriteTimeout,
		"http_idle_timeout", c.Http.IDLETimeout,
		"http_disable_keep_alive", c.Http.DisableKeepAlive,
		"http_disable_parse_multipart_form", c.Http.DisablePreParseMultipartForm,
		"admin_user", c.Http.AdminUser,
		"admin_pass_len", len(c.Http.AdminPass),
		"control_header_name", c.Http.ControlHeaderName,
		"control_header_value_len", len(c.Http.ControlHeaderValue),
		"sso_proxy_auth_enabled", c.Http.SSOProxyAuth,
		"sso_proxy_auth_header_name", c.Http.SSOProxyAuthHeaderName,
		"sso_proxy_auth_trusted", c.Http.SSOProxyAuthTrusted,
		"http_allow_header_only_shortcut_auth", c.Http.AllowHeaderOnlyShortcutAuth,
	)
}

func (c *Config) IsValid() error {
	if err := c.Http.IsValid(); err != nil {
		return fmt.Errorf("http configuration is invalid: %w", err)
	}

	return nil
}

// ParseServerConfiguration parses the configuration from the enabled lookupers
func ParseServerConfiguration(ctx context.Context, logger *slog.Logger) *Config {
	var cfg Config

	lookupers := envconfig.MultiLookuper(
		envconfig.MapLookuper(map[string]string{"HOSTNAME": os.Getenv("HOSTNAME")}),
		envconfig.MapLookuper(readDotEnv(logger)),
		envconfig.MapLookuper(map[string]string{
			"ADMIN_USER":           os.Getenv("ADMIN_USER"),
			"ADMIN_PASS":           os.Getenv("ADMIN_PASS"),
			"CONTROL_HEADER_NAME":  os.Getenv("CONTROL_HEADER_NAME"),
			"CONTROL_HEADER_VALUE": os.Getenv("CONTROL_HEADER_VALUE"),
		}),
		envconfig.PrefixLookuper("SHIORI_", envconfig.OsLookuper()),
	)

	if err := envconfig.ProcessWith(ctx, &envconfig.Config{
		Target:   &cfg,
		Lookuper: lookupers,
	}); err != nil {
		logger.Error("Error parsing configuration", "error", err)
		os.Exit(1)
	}

	return &cfg
}

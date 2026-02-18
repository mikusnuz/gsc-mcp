# gsc-mcp

[English](README.md) | **한국어**

[![MCP Badge](https://lobehub.com/badge/mcp/mikusnuz-gsc-mcp)](https://lobehub.com/mcp/mikusnuz-gsc-mcp)

**Google Search Console API**와 **Google Indexing API**를 위한 MCP 서버 — 전체 API 커버리지 지원.

다른 `searchAnalytics.query`만 래핑하는 GSC MCP 서버와 달리, 이 서버는 Google Search Console과 Indexing API의 **모든 엔드포인트**를 노출합니다.

## 도구 (12개)

### Sites
| Tool | 설명 |
|------|------|
| `sites_list` | Search Console의 모든 사이트(속성) 목록 표시 |
| `sites_get` | 특정 사이트의 세부정보 조회 |
| `sites_add` | 새 사이트(속성) 추가 |
| `sites_delete` | 사이트 제거 |

### Sitemaps
| Tool | 설명 |
|------|------|
| `sitemaps_list` | 사이트에 제출된 모든 사이트맵 목록 표시 |
| `sitemaps_get` | 특정 사이트맵의 세부정보 조회 |
| `sitemaps_submit` | 사이트맵 제출 |
| `sitemaps_delete` | 사이트맵 삭제 |

### 검색 분석
| Tool | 설명 |
|------|------|
| `search_analytics_query` | 검색 성과 데이터(클릭수, 노출수, CTR, 순위) 필터링 및 그룹화하여 쿼리 |

### URL 검사
| Tool | 설명 |
|------|------|
| `url_inspection_inspect` | URL의 색인 상태, 크롤 정보, 리치 결과, AMP, 모바일 사용성 검사 |

### Indexing API
| Tool | 설명 |
|------|------|
| `indexing_publish` | URL 업데이트 또는 제거에 대해 Google에 알림 |
| `indexing_get_metadata` | URL의 최신 알림 상태 조회 |

## 인증

두 가지 인증 방법을 지원합니다.

### 옵션 1: OAuth2 Refresh Token

```json
{
  "mcpServers": {
    "gsc-mcp": {
      "command": "npx",
      "args": ["-y", "@mikusnuz/gsc-mcp"],
      "env": {
        "GSC_CLIENT_ID": "your-client-id",
        "GSC_CLIENT_SECRET": "your-client-secret",
        "GSC_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

필수 OAuth2 스코프:
- `https://www.googleapis.com/auth/webmasters`
- `https://www.googleapis.com/auth/indexing`

### 옵션 2: Service Account

```json
{
  "mcpServers": {
    "gsc-mcp": {
      "command": "npx",
      "args": ["-y", "@mikusnuz/gsc-mcp"],
      "env": {
        "GSC_SERVICE_ACCOUNT_KEY_PATH": "/path/to/service-account-key.json"
      }
    }
  }
}
```

Service Account는 각 사이트에 대해 Google Search Console에 소유자 또는 사용자로 추가되어야 합니다.

## 설정 가이드

### OAuth2 설정

1. [Google Cloud Console](https://console.cloud.google.com/)로 이동
2. 프로젝트 생성 (또는 기존 프로젝트 선택)
3. **Search Console API**와 **Indexing API** 활성화
4. OAuth 2.0 자격증명 생성 (Desktop 앱 타입)
5. [OAuth Playground](https://developers.google.com/oauthplayground/)를 사용하여 다음 스코프로 Refresh Token 생성:
   - `https://www.googleapis.com/auth/webmasters`
   - `https://www.googleapis.com/auth/indexing`

### Service Account 설정

1. [Google Cloud Console](https://console.cloud.google.com/)로 이동
2. Service Account 생성
3. JSON 키 파일 다운로드
4. **Search Console API**와 **Indexing API** 활성화
5. Search Console에서 각 사이트에 Service Account 이메일을 소유자로 추가

## 라이선스

MIT

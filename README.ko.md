# gsc-mcp

[![npm version](https://img.shields.io/npm/v/@mikusnuz%2Fgsc-mcp)](https://www.npmjs.com/package/@mikusnuz/gsc-mcp)

[English](README.md) | **한국어**

[![MCP Badge](https://lobehub.com/badge/mcp/mikusnuz-gsc-mcp)](https://lobehub.com/mcp/mikusnuz-gsc-mcp)

**Google Search Console API**와 **Google Indexing API**를 위한 MCP 서버 — 전체 API 커버리지 지원.

다른 `searchAnalytics.query`만 래핑하는 GSC MCP 서버와 달리, 이 서버는 Google Search Console과 Indexing API의 **모든 엔드포인트**를 노출합니다.

## 도구 (13개)

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
| `search_analytics_query` | 검색 성과 데이터(클릭수, 노출수, CTR, 순위) 필터링 및 그룹화하여 쿼리. `hour` 차원으로 시간별 데이터 지원. |

### URL 검사
| Tool | 설명 |
|------|------|
| `url_inspection_inspect` | URL의 색인 상태, 크롤 정보, 리치 결과, AMP 검사(지원 중단된 모바일 사용성 필드는 없을 수 있음) |

### Indexing API
| Tool | 설명 |
|------|------|
| `indexing_publish` | 지원 대상 `JobPosting` 또는 `BroadcastEvent` URL의 업데이트/제거 알림 |
| `indexing_get_metadata` | 지원 대상 URL의 최신 알림 메타데이터 조회(`contentType` 필수, 색인 상태가 아님) |
| `indexing_batch_publish` | 지원 대상 URL 최대 100개를 알리고 각 하위 요청 상태를 개별 보고 |

> **Indexing API 지원 대상:** Google은 `JobPosting` 구조화 데이터가 있는
> 페이지 또는 `VideoObject` 안에 `BroadcastEvent`가 포함된 실시간 스트림
> 페이지만 지원합니다. 도구 호출 시 해당 유형을 `contentType`으로 반드시
> 지정해야 합니다. API 성공 응답은 알림 접수만 뜻하며 실제 색인을 보장하지
> 않습니다. 실제 색인 상태는 `url_inspection_inspect`로 확인하세요. 자세한
> 내용은 Google의 [Indexing API 사용 가이드](https://developers.google.com/search/apis/indexing-api/v3/using-api)를 참고하세요.

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

Search Console 조회/관리 도구는 필요한 권한을 가진 소유자 또는 사용자로
Service Account를 추가하면 됩니다. **Indexing API** 도구를 사용하려면
Service Account가 해당 속성의 **위임된 소유자**여야 하며 사용자 권한만으로는
충분하지 않습니다.

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

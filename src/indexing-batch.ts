export interface IndexingNotification {
  url: string;
  type: "URL_UPDATED" | "URL_DELETED";
  contentType: "JobPosting" | "BroadcastEvent";
}

export interface IndexingBatchResult extends IndexingNotification {
  index: number;
  contentId?: string;
  status: number;
  ok: boolean;
  body: unknown;
}

function parseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

/**
 * Parse Google's multipart/mixed batch response into one result per submitted
 * notification. An outer HTTP 200 only means the batch envelope was accepted;
 * each embedded HTTP response has its own status and must be checked.
 */
export function parseIndexingBatchResponse(
  responseText: string,
  contentType: string,
  notifications: IndexingNotification[],
): IndexingBatchResult[] {
  const boundaryMatch = contentType.match(
    /boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i,
  );
  if (!boundaryMatch) {
    throw new Error("Google batch response did not include a multipart boundary");
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const parts = responseText
    .split(`--${boundary}`)
    .map((part) => part.replace(/^\r?\n/, "").replace(/\r?\n$/, ""))
    .filter((part) => part && part !== "--");

  const parsed = parts.map((part, position) => {
    const statusMatch = part.match(/HTTP\/\d(?:\.\d)?\s+(\d{3})[^\r\n]*/i);
    if (!statusMatch) {
      throw new Error(`Google batch response part ${position + 1} has no HTTP status`);
    }

    const contentIdMatch = part.match(/^Content-ID:\s*<?([^>\r\n]+)>?/im);
    const rawContentId = contentIdMatch?.[1]?.trim();
    const itemMatch = rawContentId?.match(/(?:response-)?item-(\d+)/i);
    const notificationIndex = itemMatch
      ? Number(itemMatch[1]) - 1
      : position;
    const statusLineEnd = part.indexOf("\n", statusMatch.index);
    const embeddedHeadersEnd = part.indexOf("\r\n\r\n", statusLineEnd);
    const lfHeadersEnd = part.indexOf("\n\n", statusLineEnd);
    const bodyStart =
      embeddedHeadersEnd >= 0
        ? embeddedHeadersEnd + 4
        : lfHeadersEnd >= 0
          ? lfHeadersEnd + 2
          : part.length;
    const status = Number(statusMatch[1]);
    const notification = notifications[notificationIndex];

    if (!notification) {
      throw new Error(
        `Google batch response referenced unknown item ${notificationIndex + 1}`,
      );
    }

    return {
      ...notification,
      index: notificationIndex,
      contentId: rawContentId,
      status,
      ok: status >= 200 && status < 300,
      body: parseBody(part.slice(bodyStart)),
    } satisfies IndexingBatchResult;
  });

  const byIndex = new Map(parsed.map((result) => [result.index, result]));
  return notifications.map((notification, index) => {
    return (
      byIndex.get(index) || {
        ...notification,
        index,
        status: 0,
        ok: false,
        body: "Google batch response did not contain a result for this item",
      }
    );
  });
}

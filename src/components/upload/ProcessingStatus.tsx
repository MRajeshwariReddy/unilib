interface ProcessingStatusProps {
  status: "idle" | "uploading" | "processing" | "ready" | "failed";
  errorMessage?: string;
  documentId?: string;
}

export function ProcessingStatus({
  status,
  errorMessage,
  documentId,
}: ProcessingStatusProps) {
  if (status === "idle") return null;

  if (status === "uploading" || status === "processing") {
    return (
      <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-blue-800">
            {status === "uploading"
              ? "Uploading file to storage..."
              : "Parsing and extracting paragraphs..."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="rounded-md bg-green-50 p-4 border border-green-200 space-y-2">
        <p className="text-sm font-medium text-green-800">
          Document processed successfully!
        </p>
        {documentId && (
          <div className="flex space-x-4 text-sm">
            <a
              href={`/documents/${documentId}`}
              className="font-semibold text-green-700 hover:underline"
            >
              Open in Reader &rarr;
            </a>
            <a
              href="/my-documents"
              className="text-green-700 hover:underline"
            >
              Go to My Documents
            </a>
          </div>
        )}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-md bg-red-50 p-4 border border-red-200 space-y-2">
        <p className="text-sm font-medium text-red-800">Processing Failed</p>
        <p className="text-sm text-red-700">{errorMessage}</p>
        <div className="pt-1">
          <a
            href="/my-documents"
            className="text-xs font-semibold text-red-700 hover:underline"
          >
            View in My Documents to Retry or Delete &rarr;
          </a>
        </div>
      </div>
    );
  }

  return null;
}

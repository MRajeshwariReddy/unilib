"use client";

import { useState } from "react";
import Link from "next/link";
import { uploadAndProcessDocument } from "@/lib/documents/upload";
import { ProcessingStatus } from "./ProcessingStatus";
import { LICENSES, type LicenseValue } from "@/lib/config/licenses";
import { LIMITS } from "@/lib/config/limits";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [license, setLicense] = useState<LicenseValue>("cc_by");
  const [rightsAttested, setRightsAttested] = useState(false);

  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "ready" | "failed"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [documentId, setDocumentId] = useState<string | undefined>();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > LIMITS.MAX_FILE_SIZE_BYTES) {
      setErrorMessage("File is larger than 10 MB limit.");
      setStatus("failed");
      setFile(null);
      return;
    }

    setFile(selected);
    setStatus("idle");
    setErrorMessage(undefined);

    // Pre-fill title if empty
    if (!title) {
      const baseName = selected.name.replace(/\.[^/.]+$/, "");
      setTitle(baseName.slice(0, 200));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setErrorMessage("Please select a file to upload.");
      setStatus("failed");
      return;
    }

    if (!rightsAttested) {
      setErrorMessage("You must attest that you have rights to share this document.");
      setStatus("failed");
      return;
    }

    setStatus("uploading");
    setErrorMessage(undefined);

    const result = await uploadAndProcessDocument({
      file,
      title: title.trim(),
      description: description.trim() || undefined,
      subject: subject.trim() || undefined,
      license,
      rightsAttested: true,
    });

    if (result.success) {
      setStatus("ready");
      setDocumentId(result.documentId);
    } else {
      setStatus("failed");
      setErrorMessage(result.errorMessage);
      setDocumentId(result.documentId);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-md border border-gray-200">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Upload Educational Document
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Supported formats: <strong className="font-semibold text-gray-800">DOCX, Markdown (.md), Plain Text (.txt)</strong>.
          <span className="block text-xs text-amber-700 mt-1">
            Note: PDFs are not supported in the MVP. Convert PDFs to DOCX or Markdown first.
          </span>
        </p>

        <ProcessingStatus
          status={status}
          errorMessage={errorMessage}
          documentId={documentId}
        />

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document File (max 10 MB)
            </label>
            <input
              type="file"
              required
              accept=".docx,.md,.markdown,.txt"
              onChange={handleFileChange}
              disabled={status === "uploading" || status === "processing"}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={status === "uploading" || status === "processing"}
              placeholder="e.g. Introduction to Algorithms - Lecture 1"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject (Optional)
            </label>
            <input
              type="text"
              maxLength={100}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={status === "uploading" || status === "processing"}
              placeholder="e.g. Computer Science"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={status === "uploading" || status === "processing"}
              placeholder="Brief summary of what this document covers..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License
            </label>
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value as LicenseValue)}
              disabled={status === "uploading" || status === "processing"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
            >
              {LICENSES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={rightsAttested}
                onChange={(e) => setRightsAttested(e.target.checked)}
                disabled={status === "uploading" || status === "processing"}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">
                I attest that I own this work, have permission to share it, or it is public-domain / appropriately licensed under the chosen license. See{" "}
                <Link href="/copyright" className="text-blue-600 underline">
                  Copyright Policy
                </Link>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={status === "uploading" || status === "processing" || !file || !rightsAttested}
            className="w-full rounded-md bg-blue-600 py-2.5 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50"
          >
            {status === "uploading"
              ? "Uploading..."
              : status === "processing"
              ? "Processing..."
              : "Upload & Process Document"}
          </button>
        </form>
      </div>
    </div>
  );
}

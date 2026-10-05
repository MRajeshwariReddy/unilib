import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          UniLib Educational Platform MVP
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-6xl text-gray-900">
          AI-Powered Academic Reading &amp; Discussion
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
          UniLib parses educational documents into permanent paragraph blocks, enables targeted
          paragraph discussions, answers questions with verifiable citations, and surfaces related
          scholarly works from OpenAlex.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/library"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Browse Library
          </Link>
          <Link
            href="/upload"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Upload Document
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-transparent bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Sign Up
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="border-t border-gray-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Designed for Student Learning &amp; Research
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Structured Documents</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Upload Markdown, DOCX, or TXT documents. Every paragraph is normalized into permanent, citable blocks.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Paragraph Discussion</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Discuss specific paragraphs directly in the reader gutter with classmates and document authors.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700 font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Grounded AI Assistant</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Ask questions or summarize text. Answers are grounded exclusively in document paragraphs with citable chips.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900">OpenAlex Readings</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Automatically discover relevant open-access scholarly papers and literature for every document.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-gray-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} UniLib. Academic Reading &amp; AI Platform.</p>
          <div className="flex gap-6">
            <Link href="/library" className="hover:text-gray-700">
              Library
            </Link>
            <Link href="/copyright" className="hover:text-gray-700">
              Copyright &amp; Licensing
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

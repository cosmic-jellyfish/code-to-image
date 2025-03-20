import CodeToImage from "@/components/code-to-image"

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-6xl space-y-8">
        <header className="text-center">
          <h1 className="text-6xl font-bold text-foreground p-2">Code to Image</h1>
          <p className="text-muted-foreground italic text-xs">
            Convert your code snippets into clean, shareable images.
          </p>
        </header>
        <div className="bg-card p-6 rounded-lg shadow-lg">
          <CodeToImage />
        </div>
      </div>
    </main>
  )
}


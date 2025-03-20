"use client";

import { useState, useRef, useCallback, useMemo, useEffect, ChangeEvent } from "react";
import { toPng, toSvg } from "html-to-image";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark, materialLight, dracula, solarizedlight, vs, xonokai } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Update themes type definition
const themes = {
  "Atom Dark": atomDark,
  "Material Light": materialLight,
  "Dracula": dracula,
  "Solarized Light": solarizedlight,
  "Visual Studio": vs,
  "Xonokai": xonokai,
} as const;

// Create a type for theme names
type ThemeName = keyof typeof themes;

const languages = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "html",
  "css",
  "json",
  "yaml",
  "markdown",
  "bash",
  "sql",
  // add more languages here if ever needed
];

export default function CodeToImage() {
  // Common CSS classes to avoid duplication
  const common = {
    baseInput:"bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200",
    baseTrigger:"bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-650",
    baseButton: "w-full dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-black/15",
    ghostButton:"w-full justify-center rounded-md transition-all text-gray-800 dark:text-gray-200",
    exportButton:"w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 shadow-sm text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700",
    copyButton:"w-full bg-gray-50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700",
    tabsList:"grid w-full grid-cols-2 mb-3 bg-white/50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-100 dark:border-gray-700",
    tabTrigger:"dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all text-gray-800 dark:text-gray-200 hover:bg-black/15",
    dialogContent:"sm:max-w-md bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-100 dark:border-gray-700",
  };

  // Default Component state (when you like reload the page etc)
  const [code, setCode] = useState(
    "function helloWorld() {\n  console.log('Hello, world!');\n}"
  );
  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState<ThemeName>("Atom Dark");
  const [padding, setPadding] = useState(12);
  const [borderRadius, setBorderRadius] = useState(8);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showWindowControls, setShowWindowControls] = useState(true);
  const [fileName, setFileName] = useState("helloworld.js");
  const [bgColor, setBgColor] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState("1x");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update the ref to specify the HTMLDivElement type
  const codeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Handle changes in the code textarea
  const handleCodeChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  // Memoize the syntax highlighter style based on the selected theme
  const currentThemeStyle = useMemo(() => themes[theme], [theme]);

  // Memoize the code to prevent unnecessary re-renders
  const highlighterCode = useMemo(() => code, [code]);

  // Update dimensions whenever the preview changes
  const updateDimensions = useCallback(() => {
    if (codeRef.current) {
      const preElement = codeRef.current.querySelector("pre");
      if (!preElement) return;

      const contentWidth = Math.max(
        preElement.scrollWidth,
        // Fix: Cast firstChild to HTMLElement to access scrollWidth
        (preElement.firstChild as HTMLElement)?.scrollWidth || 0,
        codeRef.current.scrollWidth
      );

      setDimensions({
        width: contentWidth + padding * 2,
        height: codeRef.current.scrollHeight,
      });
    }
  }, [padding]);


  const imageOptions = useMemo(() => {
    if (!codeRef.current) return {};

    const pixelRatio = quality === "3x" ? 3 : quality === "2x" ? 2 : 1;

    return {
      cacheBust: true,
      width: dimensions.width,
      height: dimensions.height,
      style: {
        display: "inline-block",
        overflow: "visible",
      },
      pixelRatio,
    };
  }, [dimensions, quality]);

  // Export the code as an image file
  const handleExport = useCallback(async () => {
    if (!codeRef.current) return;
    setIsLoading(true);

    try {
      // Store original styles
      const originalStyles = {
        width: codeRef.current.style.width,
        overflow: codeRef.current.style.overflow,
      };

      const preElement = codeRef.current.querySelector("pre");
      if (!preElement) {
        console.warn("Pre element not found");
        return;
      }

      const originalPreStyles = {
        width: preElement.style.width,
        overflow: preElement.style.overflow,
      };

      // Set container and pre element to full width
      codeRef.current.style.width = `${dimensions.width}px`;
      codeRef.current.style.overflow = "visible";
      preElement.style.width = "auto";
      preElement.style.overflow = "visible";
      preElement.style.whiteSpace = "pre";

      let dataUrl = "";
      if (format === "svg") {
        dataUrl = await toSvg(codeRef.current, imageOptions);
      } else {
        dataUrl = await toPng(codeRef.current, imageOptions);
      }

      // Restore original styles
      codeRef.current.style.width = originalStyles.width;
      codeRef.current.style.overflow = originalStyles.overflow;
      preElement.style.width = originalPreStyles.width;
      preElement.style.overflow = originalPreStyles.overflow;
      preElement.style.whiteSpace = "pre-wrap";

      const baseFileName = fileName.replace(/\.[^/.]+$/, "") || "code-snippet";
      const finalFileName = `${baseFileName}.${format}`;

      const link = document.createElement("a");
      link.download = finalFileName;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Image exported",
        description: `Your code image has been downloaded as ${format.toUpperCase()}.`,
      });

      setShowExportDialog(false);
    } catch (err) {
      console.error("Export failed", err);
      toast({
        title: "Export failed",
        description: "There was an error exporting your image.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, format, quality, fileName, imageOptions, dimensions]);

  // Copy the code image to the clipboard
  const copyToClipboard = useCallback(async () => {
    if (!codeRef.current) return;
    setIsLoading(true);

    try {
      const originalStyles = {
        width: codeRef.current.style.width,
        overflow: codeRef.current.style.overflow,
      };

      const preElement = codeRef.current.querySelector("pre");
      if (!preElement) {
        throw new Error("Pre element not found");
      }

      const originalPreStyles = {
        width: preElement.style.width,
        overflow: preElement.style.overflow,
      };

      codeRef.current.style.width = `${dimensions.width}px`;
      codeRef.current.style.overflow = "visible";
      preElement.style.width = "auto";
      preElement.style.overflow = "visible";
      preElement.style.whiteSpace = "pre";

      const dataUrl = await toPng(codeRef.current, imageOptions);

      codeRef.current.style.width = originalStyles.width;
      codeRef.current.style.overflow = originalStyles.overflow;
      preElement.style.width = originalPreStyles.width;
      preElement.style.overflow = originalPreStyles.overflow;
      preElement.style.whiteSpace = "pre-wrap";

      const blob = await fetch(dataUrl).then((res) => res.blob());
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      toast({
        title: "Copied to clipboard",
        description: "Your code image has been copied to clipboard.",
      });

      setShowExportDialog(false);
    } catch (err) {
      console.error("Copy failed", err);
      toast({
        title: "Copy failed",
        description: "There was an error copying your image.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, imageOptions, dimensions]);

  // Memoized SyntaxHighlighter component
  const MemoizedSyntaxHighlighter = useMemo(
    () => (
      <SyntaxHighlighter
        language={language}
        style={currentThemeStyle}
        showLineNumbers={showLineNumbers}
        wrapLines={true}
        customStyle={{
          margin: 0,
          borderRadius: `${borderRadius / 2}px`,
          fontSize: "14px",
          width: "auto",
          minWidth: "100%",
        }}
      >
        {highlighterCode}
      </SyntaxHighlighter>
    ),
    [highlighterCode, language, currentThemeStyle, showLineNumbers, borderRadius]
  );

  // "Reset all settings" option will reset to the default values:
  const handleReset = () => {
    setCode("function helloWorld() {\n  console.log('Hello, world!');\n}");
    setLanguage("javascript");
    setTheme("Atom Dark");
    setPadding(12);
    setBorderRadius(8);
    setShowLineNumbers(true);
    setShowWindowControls(true);
    setFileName("helloworld.js");
    setBgColor("");
  };

  useEffect(() => {
    updateDimensions();
    if (codeRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      resizeObserver.observe(codeRef.current);
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [code, padding, borderRadius, language, theme, showLineNumbers, updateDimensions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-900/80 dark:to-gray-800/80 p-6 rounded-xl backdrop-blur-sm border border-gray-100 dark:border-gray-800 shadow-sm" suppressHydrationWarning={true}>
      {/* Left panel: Settings and actions */}
      <div className="space-y-4">
        <Tabs defaultValue="code" className="w-full">
          <TabsList className={common.tabsList}>
            <TabsTrigger value="code" className={common.tabTrigger}>Code</TabsTrigger>
            <TabsTrigger value="appearance" className={common.tabTrigger}>Appearance</TabsTrigger>
          </TabsList>
          <div className="space-y-4">

            {/* Code settings */}
            <TabsContent value="code" className="space-y-4 mt-0 p-0">
              <Textarea
                placeholder="Paste your code here..."
                className={`font-mono h-64 resize-none ${common.baseInput} rounded-lg shadow-inner`}
                value={code}
                onChange={handleCodeChange}/>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language" className={common.baseTrigger}>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className={`bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-700`}>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang} className="text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-650">
                          {lang.charAt(0).toUpperCase() + lang.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filename" className="text-sm font-medium text-gray-700 dark:text-gray-300">Filename</Label>
                  <Input
                    id="filename"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="example.js"
                    className={common.baseInput}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Appearance settings */}
            <TabsContent value="appearance" className="mt-0 p-0 space-y-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="theme" className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</Label>
                    <Select value={theme} onValueChange={(value) => setTheme(value as ThemeName)}>
                      <SelectTrigger id="theme" className={common.baseTrigger}>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent className={`bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-700`}>
                        {Object.keys(themes).map((themeName) => (
                          <SelectItem key={themeName} value={themeName} className="text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-650">
                            {themeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="padding" className="text-sm font-medium text-gray-700 dark:text-gray-300">Padding</Label>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{padding}px</span>
                    </div>
                    <Slider
                      id="padding"
                      min={0}
                      max={64}
                      step={4}
                      value={[padding]}
                      onValueChange={(value) => setPadding(value[0])}
                      className="py-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="borderRadius" className="text-sm font-medium text-gray-700 dark:text-gray-300">Border Radius</Label>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{borderRadius}px</span>
                    </div>
                    <Slider
                      id="borderRadius"
                      min={0}
                      max={20}
                      step={2}
                      value={[borderRadius]}
                      onValueChange={(value) => setBorderRadius(value[0])}
                      className="py-1"
                    />
                  </div>
                  <div className="space-y-2 pt-1">
                    <Label htmlFor="bgColor" className="text-sm font-medium text-gray-700 dark:text-gray-300">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bgColor"
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        placeholder="#ffffff, transparent, white, etc."
                        className={`flex-1 ${common.baseInput}`}
                      />
                      <div className="relative w-14 h-9 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-700 rounded-md overflow-hidden">
                        <Input
                          type="color"
                          value={bgColor || "#333333"}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-100 cursor-pointer p-0 m-0 border-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center space-x-2 bg-white dark:bg-gray-700 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                    <Switch id="lineNumbers" checked={showLineNumbers} onCheckedChange={setShowLineNumbers} />
                    <Label htmlFor="lineNumbers" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Line Numbers</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-white dark:bg-gray-700 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                    <Switch id="windowControls" checked={showWindowControls} onCheckedChange={setShowWindowControls} />
                    <Label htmlFor="windowControls" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Window Controls</Label>
                  </div>
                </div>
                <div className="pt-1">
                  <Button onClick={handleReset} className={common.baseButton}>
                    <RefreshCw className="w-4 h-4 mr-2" />Reset All Settings</Button>
                </div>
              </div>
            </TabsContent>
          </div>
          
          {/* Actions */}
          <div className="mt-4">
            <Button
              onClick={() => {
                updateDimensions();
                setShowExportDialog(true);
              }}
              className={common.baseButton}>
              <Download className="w-4 h-4 mr-2" />Export Image</Button>
          </div>
        </Tabs>
      </div>
      
      {/* Right panel: Preview */}
      <div className="min-h-[400px] flex items-center justify-center p-4 bg-gradient-to-br from-gray-50/30 to-gray-100/30 dark:from-gray-800/30 dark:to-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-800 overflow-auto">
        <div
          ref={codeRef}
          style={{
            padding: `${padding}px`,
            borderRadius: `${borderRadius}px`,
            backgroundColor: bgColor || "#333333",
            transition: "all 150ms ease",
            maxWidth: "100%",
          }}
          className="shadow-lg">
          {showWindowControls && (
            <div className="flex items-center gap-1.5 pb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              {fileName && (
                <div className="ml-2 text-xs text-gray-300 dark:text-gray-400 font-mono">
                  {fileName}
                </div>
              )}
            </div>
          )}
          {MemoizedSyntaxHighlighter}
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className={common.dialogContent}>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Export Image</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">Choose your export options below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">

            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Image Format</Label>
              <div className="bg-gray-50 dark:bg-gray-900 p-1 rounded-lg flex">
                <Button
                  variant="ghost"
                  onClick={() => setFormat("png")}
                  className={`${common.ghostButton} ${
                    format === "png"
                      ? "bg-white dark:bg-gray-700 shadow-sm"
                      : "hover:bg-white/80 dark:hover:bg-gray-700/80 hover:text-gray-900 dark:hover:text-white"
                  }`}>PNG</Button>
                <Button
                  variant="ghost"
                  onClick={() => setFormat("svg")}
                  className={`${common.ghostButton} ${
                    format === "svg"
                      ? "bg-white dark:bg-gray-700 shadow-sm"
                      : "hover:bg-white/80 dark:hover:bg-gray-700/80 hover:text-gray-900 dark:hover:text-white"
                  }`}>SVG</Button>
              </div>
            </div>

            {/* Quality Selection - only shown for PNG option here - SVG Scalable*/}
            {format === "png" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Image Quality</Label>
                <div className="bg-gray-50 dark:bg-gray-900 p-1 rounded-lg flex">
                  <Button
                    variant="ghost"
                    onClick={() => setQuality("1x")}
                    className={`${common.ghostButton} ${
                      quality === "1x"
                        ? "bg-white dark:bg-gray-700 shadow-sm"
                        : "hover:bg-white/80 dark:hover:bg-gray-700/80 hover:text-gray-900 dark:hover:text-white"
                    }`}>1x</Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => setQuality("2x")}
                    className={`${common.ghostButton} ${
                      quality === "2x"
                        ? "bg-white dark:bg-gray-700 shadow-sm"
                        : "hover:bg-white/80 dark:hover:bg-gray-700/80 hover:text-gray-900 dark:hover:text-white"
                    }`}>2x</Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => setQuality("3x")}
                    className={`${common.ghostButton} ${
                      quality === "3x"
                        ? "bg-white dark:bg-gray-700 shadow-sm"
                        : "hover:bg-white/80 dark:hover:bg-gray-700/80 hover:text-gray-900 dark:hover:text-white"
                    }`}>3x</Button>
                </div>
              </div>
            )}

            {/* Dimensions info */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Output Dimensions</Label>
              <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                {format === "png" ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`p-2 text-center text-sm rounded-md transition-all ${quality === "1x" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-200" : "text-gray-600 dark:text-gray-400"}`}>
                      <div className="font-semibold">1x</div>
                      <div className="text-xs">
                        {dimensions.width} × {dimensions.height}
                      </div>
                    </div>
                    <div className={`p-2 text-center text-sm rounded-md transition-all ${quality === "2x" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-200" : "text-gray-600 dark:text-gray-400"}`}>
                      <div className="font-semibold">2x</div>
                      <div className="text-xs">
                        {dimensions.width * 2} × {dimensions.height * 2}
                      </div>
                    </div>
                    <div className={`p-2 text-center text-sm rounded-md transition-all ${quality === "3x" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-200" : "text-gray-600 dark:text-gray-400"}`}>
                      <div className="font-semibold">3x</div>
                      <div className="text-xs">
                        {dimensions.width * 3} × {dimensions.height * 3}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 text-center text-sm rounded-md bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-200">
                    <div className="font-semibold">SVG (Scalable)</div>
                    <div className="text-xs">
                      Base: {dimensions.width} × {dimensions.height}
                    </div>
                  </div>
                )}
              </div>
              {dimensions.width > 1000 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                  Wide code detected. Full width will be exported correctly.
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={handleExport}
                disabled={isLoading}
                className={common.exportButton}>
                <Download className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Processing..." : `Download ${format.toUpperCase()}`}
              </Button>
              <Button
                onClick={copyToClipboard}
                disabled={isLoading}
                variant="outline"
                className={common.copyButton}>
                <Copy className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Processing..." : "Copy to Clipboard"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

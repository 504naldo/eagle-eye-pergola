import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Copy, RotateCcw } from "lucide-react";

interface PromptEditorProps {
  defaultPrompt: string;
  onPromptChange: (prompt: string) => void;
  isLoading?: boolean;
}

export function PromptEditor({
  defaultPrompt,
  onPromptChange,
  isLoading = false,
}: PromptEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(defaultPrompt);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    onPromptChange(editedPrompt);
    setIsEditing(false);
  };

  const handleReset = () => {
    setEditedPrompt(defaultPrompt);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const charCount = editedPrompt.length;
  const charLimit = 2000;
  const isOverLimit = charCount > charLimit;

  return (
    <Card className="p-4 bg-card border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">AI Rendering Prompt</h3>
          <span className="text-xs text-muted-foreground">
            {charCount} / {charLimit} chars
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-accent rounded transition-colors"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Collapsed view - show preview */}
      {!isExpanded && !isEditing && (
        <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {editedPrompt}
        </div>
      )}

      {/* Expanded/Editing view */}
      {(isExpanded || isEditing) && (
        <>
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="Enter custom prompt for AI rendering..."
            className={`w-full h-40 p-3 text-sm border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
              isOverLimit ? "border-destructive" : "border-border"
            }`}
          />

          {/* Character count warning */}
          {isOverLimit && (
            <p className="text-xs text-destructive mt-1">
              Prompt exceeds {charLimit} characters. Consider shortening for better results.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSave}
                  disabled={isLoading || isOverLimit}
                  className="flex-1"
                >
                  Save Prompt
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Edit Prompt
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  disabled={isLoading}
                  title="Copy prompt to clipboard"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>

          {/* Info text */}
          <p className="text-xs text-muted-foreground mt-2">
            {isEditing
              ? "Edit the prompt to customize the AI rendering. Be specific about style, composition, and details."
              : "Click 'Edit Prompt' to customize the rendering instructions for the AI model."}
          </p>
        </>
      )}

      {/* Collapsed view - show edit button */}
      {!isExpanded && !isEditing && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsExpanded(true);
              setIsEditing(true);
            }}
            disabled={isLoading}
            className="flex-1"
          >
            Edit Prompt
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={isLoading}
            title="Copy prompt to clipboard"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      )}
    </Card>
  );
}

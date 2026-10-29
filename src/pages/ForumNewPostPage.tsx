import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/locale-router";
import { Link } from "@/lib/locale-router";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, ARTICLE_IMAGE } from "@/lib/compressImage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CommunityIcon from "@/components/forum/CommunityIcon";
import { toast } from "sonner";
import { useDataOptOut } from "@/hooks/useDataOptOut";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Strikethrough, Superscript, Heading2,
  Link2, ImageIcon, SmilePlus, List, ListOrdered,
  Quote, Code, TableIcon, Eye, EyeOff, ChevronDown,
  Clock, Type, LinkIcon, BarChart3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FlairPicker from "@/components/forum/FlairPicker";

type ContentType = "text" | "image" | "link" | "poll";

const MAX_TITLE = 300;

const ForumNewPostPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { guardOptOut } = useDataOptOut();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("text");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
  const [selectedFlairId, setSelectedFlairId] = useState<string | null>(null);

  // Auto-save draft
  useEffect(() => {
    const saved = localStorage.getItem("forum-draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.title) setTitle(draft.title);
        if (draft.content) setContent(draft.content);
        if (draft.contentType) setContentType(draft.contentType);
        if (draft.communityId) setCommunityId(draft.communityId);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("forum-draft", JSON.stringify({ title, content, contentType, communityId }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content, contentType, communityId]);

  // Load communities
  useEffect(() => {
    if (!user) return;
    supabase
      .from("forum_community_members")
      .select("community_id, forum_communities(id, slug, name, icon)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const list = (data || []).map((m: any) => m.forum_communities).filter(Boolean);
        setCommunities(list);
        // If communityId was saved in draft, select it
        if (communityId) {
          const found = list.find((c: any) => c.id === communityId);
          if (found) setSelectedCommunity(found);
        }
      });
  }, [user]);

  // Image preview
  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("post-content") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + prefix + selected + suffix + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleSubmit = async () => {
    if (guardOptOut()) return;
    if (!user) { toast.error("Bitte anmelden."); return; }
    if (!title.trim()) { toast.error("Titel ist erforderlich."); return; }
    if (contentType === "text" && !content.trim()) { toast.error("Inhalt ist erforderlich."); return; }
    if (contentType === "link" && !linkUrl.trim()) { toast.error("Link ist erforderlich."); return; }

    setSubmitting(true);

    let imageUrl: string | null = null;
    if (contentType === "image" && imageFile) {
      const image = await compressImage(imageFile, ARTICLE_IMAGE);
      const ext = image.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("forum-images").upload(path, image);
      if (!error) {
        const { data } = supabase.storage.from("forum-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }

    const finalContent = contentType === "link" ? `[${linkUrl}](${linkUrl})\n\n${content}` : content;

    const { data, error } = await supabase.from("forum_posts").insert({
      user_id: user.id,
      title: title.trim(),
      content: finalContent.trim(),
      category: "allgemein",
      community_id: communityId,
      image_url: imageUrl,
      flair_id: selectedFlairId,
    } as any).select("id").single();

    if (!error && data) {
      localStorage.removeItem("forum-draft");
      if (communityId) {
        const comm = communities.find(c => c.id === communityId);
        if (comm) {
          await supabase.from("forum_communities")
            .update({ post_count: (comm.post_count || 0) + 1 })
            .eq("id", communityId);
        }
      }
      toast.success("Post erstellt!");
      navigate(`/forum/${data.id}`);
    } else {
      toast.error("Post konnte nicht erstellt werden.");
    }
    setSubmitting(false);
  };

  const handleSaveDraft = () => {
    localStorage.setItem("forum-draft", JSON.stringify({ title, content, contentType, communityId }));
    toast.success("Entwurf gespeichert.");
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Bitte anmelden, um einen Post zu erstellen.</p>
        <Link to="/auth"><Button variant="outline" className="mt-4">Anmelden</Button></Link>
      </div>
    );
  }

  const contentTabs: { key: ContentType; label: string; icon: React.ElementType }[] = [
    { key: "text", label: "Text", icon: Type },
    { key: "image", label: "Bilder & Video", icon: ImageIcon },
    { key: "link", label: "Link", icon: LinkIcon },
    { key: "poll", label: "Umfrage", icon: BarChart3 },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-display font-bold text-foreground">Post erstellen</h1>
        <button
          onClick={() => {
            const draft = localStorage.getItem("forum-draft");
            if (draft) toast.info("Entwurf geladen.");
          }}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Entwürfe
        </button>
      </div>

      {/* Community selector pill */}
      {communities.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity mb-5">
              {selectedCommunity ? (
                <>
                  <CommunityIcon icon={selectedCommunity.icon} size="sm" />
                  <span>c/{selectedCommunity.slug}</span>
                </>
              ) : (
                <span>Community wählen</span>
              )}
              <ChevronDown className="w-4 h-4 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem
              onClick={() => { setCommunityId(null); setSelectedCommunity(null); }}
              className={cn(!communityId && "bg-primary/10")}
            >
              Keine Community
            </DropdownMenuItem>
            {communities.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onClick={() => { setCommunityId(c.id); setSelectedCommunity(c); }}
                className={cn("gap-2", communityId === c.id && "bg-primary/10")}
              >
                <CommunityIcon icon={c.icon} size="sm" />
                c/{c.slug}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Content type tabs */}
      <div className="flex items-center border-b border-border mb-5">
        {contentTabs.map((tab) => {
          const Icon = tab.icon;
          const active = contentType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setContentType(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors relative",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 hidden sm:block" />
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Editor card */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Title */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="Titel"
              className="border-border bg-secondary/30 text-base px-4 py-3 h-auto rounded-lg"
            />
            <span className="absolute -bottom-5 right-1 text-[11px] text-muted-foreground">
              <span className={title.length > MAX_TITLE * 0.9 ? "text-destructive" : ""}>
                {title.length}
              </span>
              /{MAX_TITLE}
            </span>
          </div>
        </div>

        {/* Flair + Tags */}
        <div className="px-4 pt-5 pb-2 flex items-center gap-2 flex-wrap">
          <FlairPicker
            communityId={communityId}
            flairType="post"
            selectedFlairId={selectedFlairId}
            onSelect={(flair) => setSelectedFlairId(flair?.id || null)}
          />
          <button className="px-3 py-1 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            + Tags hinzufügen
          </button>
        </div>

        {/* Link input */}
        {contentType === "link" && (
          <div className="px-4 pb-2">
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="bg-secondary/30"
            />
          </div>
        )}

        {/* Image upload */}
        {contentType === "image" && (
          <div className="px-4 pb-2">
            <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/30 transition-colors bg-secondary/20">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {imageFile ? imageFile.name : "Bild oder Video auswählen"}
              </span>
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </label>
            {imagePreview && (
              <div className="mt-3 rounded-xl overflow-hidden border border-border max-h-64">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        )}

        {/* Poll placeholder */}
        {contentType === "poll" && (
          <div className="px-4 pb-2">
            <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground text-sm">
              <BarChart3 className="w-8 h-8" />
              <p>Umfragen kommen bald...</p>
            </div>
          </div>
        )}

        {/* Text editor with toolbar */}
        {(contentType === "text" || contentType === "link") && (
          <div className="px-4 pb-4">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 p-1.5 border border-border border-b-0 rounded-t-lg bg-secondary/20 flex-wrap">
              <button onClick={() => insertMarkdown("**", "**")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Fett">
                <Bold className="w-4 h-4" />
              </button>
              <button onClick={() => insertMarkdown("*", "*")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Kursiv">
                <Italic className="w-4 h-4" />
              </button>
              <button onClick={() => insertMarkdown("~~", "~~")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Durchgestrichen">
                <Strikethrough className="w-4 h-4" />
              </button>
              <button onClick={() => insertMarkdown("<sup>", "</sup>")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Hochgestellt">
                <Superscript className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-border mx-0.5" />

              <button onClick={() => insertMarkdown("## ")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Überschrift">
                <Heading2 className="w-4 h-4" />
              </button>
              <button onClick={() => insertMarkdown("[", "](url)")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Link">
                <Link2 className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Bild">
                <ImageIcon className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Emoji">
                <SmilePlus className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-border mx-0.5" />

              <button onClick={() => insertMarkdown("- ")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Liste">
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => insertMarkdown("1. ")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Nummerierte Liste">
                <ListOrdered className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-border mx-0.5" />

              <button onClick={() => insertMarkdown("> ")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Zitat">
                <Quote className="w-4 h-4" />
              </button>
              <button onClick={() => insertMarkdown("`", "`")} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Code">
                <Code className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Tabelle">
                <TableIcon className="w-4 h-4" />
              </button>

              <div className="flex-1" />

              <button
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                  showPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Editor / Preview */}
            <div className={cn("grid gap-0", showPreview ? "lg:grid-cols-2" : "grid-cols-1")}>
              <Textarea
                id="post-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Text (optional)"
                rows={10}
                className={cn(
                  "text-sm rounded-t-none resize-y border-border",
                  showPreview ? "rounded-bl-lg lg:rounded-br-none" : "rounded-b-lg"
                )}
              />
              {showPreview && (
                <div className="border border-border border-l-0 rounded-br-lg p-4 text-sm prose prose-sm dark:prose-invert max-w-none overflow-auto bg-card min-h-[200px]">
                  {content ? (
                    <div className="whitespace-pre-wrap">{content}</div>
                  ) : (
                    <p className="text-muted-foreground italic">Vorschau erscheint hier...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveDraft}
            className="text-muted-foreground hover:text-foreground rounded-full text-xs"
          >
            Entwurf speichern
          </Button>
          <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Zeitplan">
            <Clock className="w-4 h-4" />
          </button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="rounded-full px-5"
          >
            {submitting ? "Posten..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ForumNewPostPage;

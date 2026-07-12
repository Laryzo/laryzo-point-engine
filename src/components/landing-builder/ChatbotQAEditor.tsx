import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Edit2,
  X,
  Check,
  Tag,
} from "lucide-react";
import type { QACategory } from "@/lib/landing/types";

interface Props {
  qaItems?: QACategory[];
  onChange: (qaItems: QACategory[]) => void;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function ChatbotQAEditor({ qaItems = [], onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKeyword, setEditingKeyword] = useState("");
  const [editingAnswer, setEditingAnswer] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add new category
  const addCategory = () => {
    const newCategory: QACategory = {
      id: uid(),
      name: `Kategori ${qaItems.length + 1}`,
      keywords: [],
      answers: [],
    };
    onChange([...qaItems, newCategory]);
  };

  // Delete category
  const deleteCategory = (id: string) => {
    onChange(qaItems.filter((item) => item.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  // Update category name
  const updateCategoryName = (id: string, name: string) => {
    onChange(
      qaItems.map((item) =>
        item.id === id ? { ...item, name } : item
      )
    );
  };

  // Update category ID
  const updateCategoryId = (oldId: string, newId: string) => {
    if (!newId.trim()) return;
    if (qaItems.some((item) => item.id === newId && item.id !== oldId)) {
      alert("ID kategori sudah digunakan!");
      return;
    }
    onChange(
      qaItems.map((item) =>
        item.id === oldId ? { ...item, id: newId } : item
      )
    );
    if (expandedId === oldId) setExpandedId(newId);
  };

  // Add keyword to category
  const addKeyword = (categoryId: string) => {
    onChange(
      qaItems.map((item) =>
        item.id === categoryId
          ? { ...item, keywords: [...item.keywords, ""] }
          : item
      )
    );
  };

  // Update keyword
  const updateKeyword = (categoryId: string, index: number, value: string) => {
    onChange(
      qaItems.map((item) =>
        item.id === categoryId
          ? {
              ...item,
              keywords: item.keywords.map((k, i) => (i === index ? value : k)),
            }
          : item
      )
    );
  };

  // Delete keyword
  const deleteKeyword = (categoryId: string, index: number) => {
    onChange(
      qaItems.map((item) =>
        item.id === categoryId
          ? {
              ...item,
              keywords: item.keywords.filter((_, i) => i !== index),
            }
          : item
      )
    );
  };

  // Add answer to category
  const addAnswer = (categoryId: string) => {
    onChange(
      qaItems.map((item) =>
        item.id === categoryId
          ? { ...item, answers: [...item.answers, ""] }
          : item
      )
    );
  };

  // Update answer
  const updateAnswer = (categoryId: string, index: number, value: string) => {
    onChange(
      qaItems.map((item) =>
        item.id === categoryId
          ? {
              ...item,
              answers: item.answers.map((a, i) => (i === index ? value : a)),
            }
          : item
      )
    );
  };

  // Delete answer
  const deleteAnswer = (categoryId: string, index: number) => {
    onChange(
      qaItems.map((item) =>
        item.id === categoryId
          ? {
              ...item,
              answers: item.answers.filter((_, i) => i !== index),
            }
          : item
      )
    );
  };

  // Reorder categories (move up/down)
  const moveCategory = (index: number, direction: "up" | "down") => {
    const newItems = [...qaItems];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Tag className="w-3 h-3" /> Q&A Fallback (Keyword Matching)
        </Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addCategory}
          className="text-xs h-7 px-2"
        >
          <Plus className="w-3 h-3 mr-1" /> Kategori Baru
        </Button>
      </div>

      {/* Info */}
      <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-[10px] text-blue-800">
        <p>
          Tambahkan kategori Q&A dengan keywords dan jawaban. Ketika user mengirim pesan yang cocok dengan keyword,
          chatbot akan memilih jawaban secara random dari kategori tersebut.
        </p>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {qaItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-md">
            Belum ada kategori Q&A. Klik "Kategori Baru" untuk mulai.
          </div>
        ) : (
          qaItems.map((category, idx) => (
            <Card key={category.id} className="p-3 space-y-2">
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                <Collapsible
                  open={expandedId === category.id}
                  onOpenChange={(open) => setExpandedId(open ? category.id : null)}
                  className="flex-1"
                >
                  <CollapsibleTrigger asChild>
                    <button className="flex-1 flex items-center gap-2 hover:bg-muted/50 p-1 rounded text-left">
                      {expandedId === category.id ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{category.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {category.keywords.length} keywords • {category.answers.length} jawaban
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  {/* Expanded Content */}
                  <CollapsibleContent className="pt-2 space-y-3 border-t mt-2">
                    {/* Category Name */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold">Nama Kategori</Label>
                      <Input
                        className="bg-white text-xs h-8"
                        value={category.name}
                        onChange={(e) => updateCategoryName(category.id, e.target.value)}
                        placeholder="Contoh: Manfaat Produk"
                      />
                    </div>

                    {/* Category ID */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold">ID Kategori</Label>
                      <div className="flex gap-1">
                        <Input
                          className="bg-white text-xs h-8 flex-1 font-mono"
                          value={category.id}
                          onChange={(e) => updateCategoryId(category.id, e.target.value)}
                          placeholder="ID unik (auto-generated)"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateCategoryId(category.id, uid())}
                          className="text-xs h-8 px-2"
                        >
                          Regenerate
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground">ID harus unik dan tidak boleh diubah setelah disimpan.</p>
                    </div>

                    {/* Keywords Section */}
                    <div className="space-y-2 p-2 bg-muted/40 rounded-md">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold">Keywords</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => addKeyword(category.id)}
                          className="text-[10px] h-6 px-1.5"
                        >
                          <Plus className="w-2.5 h-2.5 mr-0.5" /> Tambah
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {category.keywords.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground italic">Belum ada keywords</p>
                        ) : (
                          category.keywords.map((keyword, keyIdx) => (
                            <div key={keyIdx} className="flex gap-1">
                              <Input
                                className="bg-white text-xs h-7 flex-1"
                                value={keyword}
                                onChange={(e) =>
                                  updateKeyword(category.id, keyIdx, e.target.value)
                                }
                                placeholder="Contoh: manfaat, keuntungan, bagus"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteKeyword(category.id, keyIdx)}
                                className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        Pisahkan dengan koma untuk multiple keywords dalam satu baris.
                      </p>
                    </div>

                    {/* Answers Section */}
                    <div className="space-y-2 p-2 bg-muted/40 rounded-md">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold">Jawaban (Fallback)</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => addAnswer(category.id)}
                          className="text-[10px] h-6 px-1.5"
                        >
                          <Plus className="w-2.5 h-2.5 mr-0.5" /> Tambah
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {category.answers.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground italic">Belum ada jawaban</p>
                        ) : (
                          category.answers.map((answer, ansIdx) => (
                            <div key={ansIdx} className="flex gap-1">
                              <Textarea
                                className="bg-white text-xs min-h-[60px] resize-none flex-1"
                                value={answer}
                                onChange={(e) =>
                                  updateAnswer(category.id, ansIdx, e.target.value)
                                }
                                placeholder="Ketik jawaban fallback di sini..."
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteAnswer(category.id, ansIdx)}
                                className="text-xs px-2 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        Chatbot akan memilih salah satu jawaban secara random ketika user mengirim pesan dengan keyword yang cocok.
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Action Buttons */}
                <div className="flex gap-1">
                  {idx > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveCategory(idx, "up")}
                      className="text-xs h-7 px-2"
                      title="Pindah ke atas"
                    >
                      ↑
                    </Button>
                  )}
                  {idx < qaItems.length - 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveCategory(idx, "down")}
                      className="text-xs h-7 px-2"
                      title="Pindah ke bawah"
                    >
                      ↓
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteCategory(category.id)}
                    className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      {qaItems.length > 0 && (
        <div className="p-2 bg-muted/40 rounded-md text-[10px] text-muted-foreground">
          <div className="flex gap-4">
            <span>Total Kategori: <strong>{qaItems.length}</strong></span>
            <span>Total Keywords: <strong>{qaItems.reduce((sum, cat) => sum + cat.keywords.length, 0)}</strong></span>
            <span>Total Jawaban: <strong>{qaItems.reduce((sum, cat) => sum + cat.answers.length, 0)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import type { Section } from "@/lib/landing/types";
import { SECTION_LIBRARY } from "@/lib/landing/types";

const labelOf = (t: string) => SECTION_LIBRARY.find((x) => x.type === t)?.label || t;
const iconOf = (t: string) => SECTION_LIBRARY.find((x) => x.type === t)?.icon || "📄";

function SortableRow({
  section,
  active,
  onSelect,
  onToggle,
  onDup,
  onDelete,
}: {
  section: Section;
  active: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDup: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`flex items-center gap-1 border rounded px-2 py-2 bg-white ${active ? "ring-2 ring-primary" : ""} ${!section.visible ? "opacity-50" : ""}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none p-1 text-muted-foreground">
        <GripVertical className="w-4 h-4" />
      </button>
      <button onClick={onSelect} className="flex-1 flex items-center gap-2 text-left text-sm">
        <span>{iconOf(section.type)}</span>
        <span className="font-medium">{labelOf(section.type)}</span>
      </button>
      <button onClick={onToggle} className="p-1 text-muted-foreground hover:text-foreground" title="Toggle visibility">
        {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      <button onClick={onDup} className="p-1 text-muted-foreground hover:text-foreground" title="Duplicate">
        <Copy className="w-3.5 h-3.5" />
      </button>
      <button onClick={onDelete} className="p-1 text-red-500 hover:text-red-700" title="Hapus">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function SectionList({
  sections,
  activeId,
  onReorder,
  onSelect,
  onToggle,
  onDup,
  onDelete,
}: {
  sections: Section[];
  activeId: string | null;
  onReorder: (next: Section[]) => void;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDup: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(sections, oldIdx, newIdx));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sections.map((s) => (
            <SortableRow
              key={s.id}
              section={s}
              active={activeId === s.id}
              onSelect={() => onSelect(s.id)}
              onToggle={() => onToggle(s.id)}
              onDup={() => onDup(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

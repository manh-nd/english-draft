"use client";

import { FileText, Mail, Users, Code2, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TEMPLATES, type DocumentTemplate } from "@/lib/templates";

export interface QuickStartTemplatesProps {
  onSelectTemplate: (template: DocumentTemplate) => void;
  isCreating?: boolean;
  creatingTemplateId?: string | null;
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  blank: <FileText className="size-5" />,
  email: <Mail className="size-5" />,
  meeting_notes: <Users className="size-5" />,
  tech_spec: <Code2 className="size-5" />,
};

export function QuickStartTemplates({
  onSelectTemplate,
  isCreating = false,
  creatingTemplateId = null,
}: QuickStartTemplatesProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">
            Quick Start Templates
          </h2>
          <Badge
            variant="outline"
            className="text-[11px] font-normal text-muted-foreground"
          >
            1-Click Setup
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DOCUMENT_TEMPLATES.map((template) => {
          const isThisLoading =
            isCreating && creatingTemplateId === template.id;

          return (
            <Card
              key={template.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!isCreating) onSelectTemplate(template);
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isCreating) {
                  e.preventDefault();
                  onSelectTemplate(template);
                }
              }}
              className="group relative cursor-pointer border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {isThisLoading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      (TEMPLATE_ICONS[template.id] ?? (
                        <Sparkles className="size-5" />
                      ))
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-medium"
                  >
                    {template.badge}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {template.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

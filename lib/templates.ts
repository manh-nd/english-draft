export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  category: "General" | "Communication" | "Productivity" | "Engineering";
  badge: string;
  content: Record<string, unknown>;
  textContent: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "blank",
    title: "Blank Document",
    description:
      "Start fresh with a clean canvas for any writing topic or exercise.",
    category: "General",
    badge: "Scratchpad",
    content: {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    textContent: "",
  },
  {
    id: "email",
    title: "Professional Email",
    description:
      "Polished structure for business outreach, updates, or follow-ups.",
    category: "Communication",
    badge: "Business",
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            {
              type: "text",
              text: "Subject: [Project Update / Follow-up / Request]",
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Dear [Recipient Name]," }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "I hope this email finds you well. I am writing to provide a brief update regarding [Topic / Project Name].",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Key Highlights" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Completed the initial deliverables ahead of schedule.",
                    },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Next phase kickoff scheduled for next Monday.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Please let me know if you have any questions or feedback. Looking forward to hearing your thoughts.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Best regards,\n[Your Name]" }],
        },
      ],
    },
    textContent:
      "Subject: [Project Update / Follow-up / Request]\n\nDear [Recipient Name],\n\nI hope this email finds you well. I am writing to provide a brief update regarding [Topic / Project Name].\n\nKey Highlights:\n- Completed the initial deliverables ahead of schedule.\n- Next phase kickoff scheduled for next Monday.\n\nPlease let me know if you have any questions or feedback. Looking forward to hearing your thoughts.\n\nBest regards,\n[Your Name]",
  },
  {
    id: "meeting_notes",
    title: "Meeting Notes",
    description:
      "Capture agenda, discussion summaries, and clear action items.",
    category: "Productivity",
    badge: "Collaboration",
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Meeting: [Topic / Sync Name]" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Date: " },
            { type: "text", text: "[Date] | " },
            { type: "text", marks: [{ type: "bold" }], text: "Attendees: " },
            { type: "text", text: "[Names / Teams]" },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Agenda" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Review milestones and outstanding blockers",
                    },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Align on architectural decisions and timeline",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Key Decisions" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Confirmed core approach for the next release.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Action Items" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "[ ] [Assignee] Prepare draft specification document",
                    },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "[ ] [Assignee] Schedule sync with stakeholders",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    textContent:
      "Meeting: [Topic / Sync Name]\nDate: [Date] | Attendees: [Names / Teams]\n\nAgenda:\n- Review milestones and outstanding blockers\n- Align on architectural decisions and timeline\n\nKey Decisions:\n- Confirmed core approach for the next release.\n\nAction Items:\n- [ ] [Assignee] Prepare draft specification document\n- [ ] [Assignee] Schedule sync with stakeholders",
  },
  {
    id: "tech_spec",
    title: "Technical Spec",
    description:
      "Structured architectural design, problem statement, and milestones.",
    category: "Engineering",
    badge: "Architecture",
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [
            { type: "text", text: "RFC: [Feature or Architecture Name]" },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "1. Context & Motivation" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Explain the background context, user need, and primary goals for this system.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            { type: "text", text: "2. Proposed Architecture & Data Flow" },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Outline the components, data schemas, API routes, and trade-offs considered.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "3. Milestones & Verification" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Phase 1: Database models and data access layer",
                    },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Phase 2: API endpoints and service logic",
                    },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Phase 3: Interactive UI components and visual testing",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    textContent:
      "RFC: [Feature or Architecture Name]\n\n1. Context & Motivation\nExplain the background context, user need, and primary goals for this system.\n\n2. Proposed Architecture & Data Flow\nOutline the components, data schemas, API routes, and trade-offs considered.\n\n3. Milestones & Verification\n- Phase 1: Database models and data access layer\n- Phase 2: API endpoints and service logic\n- Phase 3: Interactive UI components and visual testing",
  },
];

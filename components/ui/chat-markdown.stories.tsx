import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ChatMarkdown } from "./chat-markdown";

const meta = {
  title: "UI/ChatMarkdown",
  component: ChatMarkdown,
  parameters: {
    layout: "centered",
  },
  args: {
    content: "This is a **Markdown** sample for testing.",
    isStreaming: false,
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] rounded-xl border bg-card p-4 shadow-sm">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof ChatMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RichExplanation: Story = {
  args: {
    content: `### Present Perfect vs. Past Simple

Use the **present perfect** (\`have + past participle\`) when connecting past events with the present moment:

- **Experience**: "I *have worked* in tech for 5 years." (Still true today)
- **Recent result**: "She *has just sent* the invoice."

> Avoid specific past time markers like "yesterday" or "in 2022" with present perfect.

\`\`\`typescript
// Example comparison
const pastSimple = "I sent the email yesterday.";
const presentPerfect = "I have already sent the email.";
\`\`\``,
    isStreaming: false,
  },
};

export const StreamingState: Story = {
  args: {
    content: `### Quick Tip
When writing emails, use **active voice** to keep sentences crisp:
- *Passive*: "The bug was resolved by the team."
- *Active*: "The team **resolved** the bug."`,
    isStreaming: true,
  },
};

export const CodeBlockWithCopy: Story = {
  args: {
    content: `\`\`\`json
{
  "phrase": "leverage synergies",
  "recommendedAlternative": "work together effectively",
  "level": "C1"
}
\`\`\``,
  },
};

export const CopyCodeInteraction: Story = {
  args: {
    content: `\`\`\`json
{
  "status": "success",
  "action": "fix-grammar"
}
\`\`\``,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const copyButton = await canvas.findByRole("button", {
      name: /copy code/i,
    });
    await expect(copyButton).toBeInTheDocument();
    await userEvent.click(copyButton);
    await expect(await canvas.findByText(/copied/i)).toBeInTheDocument();
  },
};

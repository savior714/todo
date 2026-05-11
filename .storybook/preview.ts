import type { Preview } from "@storybook/nextjs";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;

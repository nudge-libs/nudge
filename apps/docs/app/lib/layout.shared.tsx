import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img src="/icon.svg" alt="" className="size-5" />
          Nudge
        </>
      ),
    },
    githubUrl: "https://github.com/nudge-libs/nudge",
  };
}

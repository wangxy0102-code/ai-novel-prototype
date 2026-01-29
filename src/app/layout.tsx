import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "归墟轮回 - 生成式交互小说",
  description: "全维度剧情自定义+世界自主演进，你的选择重塑世界走向",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

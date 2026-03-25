import { NextRequest, NextResponse } from "next/server";
import { createPage } from "@/lib/notion";

export async function POST(request: NextRequest) {
  try {
    const { title, category, deadline, newsletterDate, direction } =
      await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const page = await createPage({
      title,
      category: category || "인사이트",
      deadline: deadline || null,
      newsletterDate: newsletterDate || null,
      slackLink: null,
      direction: direction || "",
    });

    return NextResponse.json({ ok: true, pageId: (page as { id: string }).id });
  } catch (error) {
    console.error("Notion create failed:", error);
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  updatePageStatus,
  updatePageCheckbox,
  updatePageUrl,
  updatePageRichText,
} from "@/lib/notion";

export async function POST(request: NextRequest) {
  try {
    const { pageId, field, value, type } = await request.json();

    if (!pageId || !field) {
      return NextResponse.json(
        { error: "pageId and field are required" },
        { status: 400 }
      );
    }

    switch (type) {
      case "status":
        await updatePageStatus(pageId, field, value);
        break;
      case "checkbox":
        await updatePageCheckbox(pageId, field, value);
        break;
      case "url":
        await updatePageUrl(pageId, field, value);
        break;
      case "rich_text":
        await updatePageRichText(pageId, field, value);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notion update failed:", error);
    return NextResponse.json(
      { error: "Failed to update Notion" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { reviewContent } from "@/lib/review";

export async function POST(request: NextRequest) {
  try {
    const { pageId, title } = await request.json();

    if (!pageId || !title) {
      return NextResponse.json(
        { error: "pageId and title are required" },
        { status: 400 }
      );
    }

    const result = await reviewContent(pageId, title);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Review failed:", error);
    return NextResponse.json(
      { error: "Review failed" },
      { status: 500 }
    );
  }
}

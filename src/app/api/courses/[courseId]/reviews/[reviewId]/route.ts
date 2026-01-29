// app/api/courses/[courseId]/reviews/[reviewId]/route.ts
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for updating a review
const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().optional(),
});

// GET /api/courses/:courseId/reviews/:reviewId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; reviewId: string }> }
) {
  try {
    const reviewId = (await params).reviewId;

    const review = await db.courseReview.findUnique({
      where: {
        id: reviewId,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        course: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}

// PATCH /api/courses/:courseId/reviews/:reviewId
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; reviewId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = (await params).reviewId;
    const courseId = (await params).courseId;
    const body = await req.json();

    // Validate request body
    const validation = updateReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues },
        { status: 400 }
      );
    }

    // Get user's student profile
    const studentProfile = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Find the review
    const review = await db.courseReview.findUnique({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if the user is the owner of the review
    if (review.studentId !== studentProfile.id) {
      return NextResponse.json(
        { error: "You can only edit your own reviews" },
        { status: 403 }
      );
    }

    // Update the review
    const updatedReview = await db.courseReview.update({
      where: {
        id: reviewId,
      },
      data: {
        ...(validation.data.rating && { rating: validation.data.rating }),
        ...(validation.data.comment !== undefined && {
          comment: validation.data.comment,
        }),
      },
    });

    // Update course rating
    await updateCourseRating(courseId);

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/:courseId/reviews/:reviewId
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; reviewId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = (await params).reviewId;
    const courseId = (await params).courseId;

    // Get user's student profile
    const studentProfile = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Find the review
    const review = await db.courseReview.findUnique({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if the user is the owner of the review or an admin
    const isTeacher = await db.course.findFirst({
      where: {
        id: courseId,
        teacher: {
          userId: session.user.id,
        },
      },
    });

    if (review.studentId !== studentProfile.id && !isTeacher) {
      return NextResponse.json(
        { error: "You do not have permission to delete this review" },
        { status: 403 }
      );
    }

    // Delete the review
    await db.courseReview.delete({
      where: {
        id: reviewId,
      },
    });

    // Update course rating
    await updateCourseRating(courseId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}

// Instructor response endpoint
// POST /api/courses/:courseId/reviews/:reviewId/respond
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; reviewId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = (await params).reviewId;
    const courseId = (await params).courseId;
    const body = await req.json();

    // Validate instructor response
    if (!body.response || typeof body.response !== "string") {
      return NextResponse.json(
        { error: "Response is required" },
        { status: 400 }
      );
    }

    // Check if user is the course teacher
    const isTeacher = await db.course.findFirst({
      where: {
        id: courseId,
        teacher: {
          userId: session.user.id,
        },
      },
    });

    if (!isTeacher) {
      return NextResponse.json(
        { error: "Only the course instructor can respond to reviews" },
        { status: 403 }
      );
    }

    // Update the review with instructor response
    const updatedReview = await db.courseReview.update({
      where: {
        id: reviewId,
      },
      data: {
        instructorResponse: body.response,
        instructorResponseDate: new Date(),
      },
    });

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error("Error responding to review:", error);
    return NextResponse.json(
      { error: "Failed to submit response" },
      { status: 500 }
    );
  }
}

// Helper function to update course rating
async function updateCourseRating(courseId: string) {
  // Calculate average rating
  const result = await db.courseReview.aggregate({
    where: {
      courseId,
      status: "PUBLISHED",
    },
    _avg: {
      rating: true,
    },
    _count: true,
  });

  // Update course with new rating data
  await db.course.update({
    where: { id: courseId },
    data: {
      rating: result._avg.rating || 0,
      reviewCount: result._count,
    },
  });
}

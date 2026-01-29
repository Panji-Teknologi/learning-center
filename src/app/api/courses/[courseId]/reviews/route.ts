// app/api/courses/[courseId]/reviews/route.ts
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for creating a review
const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

// GET /api/courses/:courseId/reviews
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const courseId = (await params).courseId;

    // Get query parameters for pagination
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Fetch reviews with pagination
    const reviews = await db.courseReview.findMany({
      where: {
        courseId,
        status: "PUBLISHED",
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
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalReviews = await db.courseReview.count({
      where: {
        courseId,
        status: "PUBLISHED",
      },
    });

    return NextResponse.json({
      items: reviews,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST /api/courses/:courseId/reviews
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseId = (await params).courseId;
    const body = await req.json();

    // Validate request body
    const validation = createReviewSchema.safeParse(body);
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

    // Check if user is enrolled in the course
    const enrollment = await db.enrolledCourse.findUnique({
      where: {
        studentId_courseId: {
          studentId: studentProfile.id,
          courseId,
        },
      },
    });

    // Check if user already reviewed this course
    const existingReview = await db.courseReview.findUnique({
      where: {
        studentId_courseId: {
          studentId: studentProfile.id,
          courseId,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this course" },
        { status: 400 }
      );
    }

    // Create the review
    const review = await db.courseReview.create({
      data: {
        rating: validation.data.rating,
        comment: validation.data.comment,
        studentId: studentProfile.id,
        courseId,
        isVerifiedPurchase: !!enrollment,
        status: "PUBLISHED", // Or use PENDING if you want to moderate reviews
      },
    });

    // Update course rating
    await updateCourseRating(courseId);

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
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

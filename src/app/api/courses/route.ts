import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const session = await auth();
    const userId = session?.user?.id;

    // Extract filter parameters
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("category") || undefined;
    const level = searchParams.get("level") || undefined;
    const language = searchParams.get("language") || undefined;
    const minPrice = Number(searchParams.get("minPrice") || 0);
    const maxPrice = Number(searchParams.get("maxPrice") || 1000);
    const minRating = Number(searchParams.get("minRating") || 0);

    let enrollments: { courseId: string }[] = [];

    // Build filters object for Prisma query
    const where: any = {
      isPublished: true,
    };

    // Handle text search
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Add category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Add level filter
    if (level) {
      where.level = level;
    }

    // Add language filter
    if (language) {
      where.language = language;
    }

    // Add price range filter
    where.price = {
      gte: minPrice,
      ...(maxPrice < 1000 && { lte: maxPrice }),
    };

    // Add rating filter
    if (minRating > 0) {
      where.rating = {
        gte: minRating,
      };
    }

    // Get courses with relevant data
    const courses = await db.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        price: true,
        isPublished: true,
        level: true,
        language: true,
        duration: true,
        totalSteps: true,
        rating: true,
        reviewCount: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        chapters: {
          select: {
            id: true,
            duration: true,
          },
        },
        enrolledStudents: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (userId) {
      const studentProfile = await db.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (studentProfile) {
        enrollments = await db.enrolledCourse.findMany({
          where: {
            studentId: studentProfile.id,
            status: "COMPLETED",
          },
          select: { courseId: true },
        });
      }
    }

    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

    // Transform data to add computed properties
    const transformedCourses = courses.map((course) => {
      // Calculate total duration from chapters
      const totalDuration = course.chapters.reduce((total, chapter) => {
        return total + (chapter.duration || 0);
      }, 0);

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        imageUrl: course.imageUrl,
        price: course.price,
        isPublished: course.isPublished,
        level: course.level,
        language: course.language,
        duration: totalDuration, // Use calculated duration instead of course.duration
        totalSteps: course.totalSteps,
        rating: course.rating,
        reviewCount: course.reviewCount,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        categoryId: course.category?.id,
        categoryName: course.category?.name,
        teacherId: course.teacher?.id,
        teacherName: course.teacher?.user?.name,
        teacherImage: course.teacher?.user?.image,
        chapterCount: course.chapters.length,
        enrolledCount: course.enrolledStudents.length,
        isEnrolled: enrolledCourseIds.has(course.id),
      };
    });

    // Get all categories for filters
    const categories = await db.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      courses: transformedCourses,
      categories,
    });
  } catch (error) {
    console.error("[COURSES_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

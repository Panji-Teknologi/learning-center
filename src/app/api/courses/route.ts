import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const level = searchParams.get("level");

    const session = await auth();
    const userId = session?.user?.id;

    // Build filter conditions
    const where: any = {
      isPublished: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (level) {
      where.level = level;
    }

    const [courses, total] = await Promise.all([
      db.course.findMany({
        where,
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              company: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                  location: true,
                  industry: true,
                },
              },
            },
          },
          category: true,
          _count: {
            select: {
              enrolledStudents: true,
              chapters: {
                where: {
                  isPublished: true,
                },
              },
            },
          },
          ...(userId && {
            enrolledStudents: {
              where: {
                student: {
                  userId: userId,
                },
                status: "COMPLETED",
              },
              select: {
                id: true,
              },
            },
          }),
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.course.count({ where }),
    ]);

    // Format response with company info
    const formattedCourses = courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      imageUrl: course.imageUrl,
      price: course.price,
      level: course.level,
      duration: course.duration,
      totalSteps: course.totalSteps,
      rating: course.rating,
      reviewCount: course.reviewCount || 0,
      language: course.language,
      categoryName: course.category?.name,
      teacherName: course.teacher?.user?.name,
      teacherProfileUrl: course.teacher?.profileUrl,
      teacherCompany: course.teacher?.company,
      enrolledCount: course._count.enrolledStudents,
      chapterCount: course._count.chapters,
      isEnrolled: userId ? course.enrolledStudents.length > 0 : false,
    }));

    return NextResponse.json({
      courses: formattedCourses,
      meta: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCourses: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("[COURSES_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

// src/sections/my-course/ChapterPlayer.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatVideoDuration } from "@/utils/formatVideoDuration";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Play,
  Lock,
  VideoOff,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface ChapterPlayerProps {
  course: any;
  chapter: any;
  chapters: any[];
  onNextChapter: () => void;
  onPreviousChapter: () => void;
  onChapterSelect: (chapterId: string) => void;
}

export default function ChapterPlayer({
  course,
  chapter,
  chapters,
  onNextChapter,
  onPreviousChapter,
  onChapterSelect,
}: ChapterPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(
    chapter?.userProgress?.[0]?.watchedSeconds || 0
  );

  // Find current chapter index
  const currentIndex = chapters.findIndex((ch) => ch.id === chapter.id);
  const hasNext = currentIndex < chapters.length - 1;
  const hasPrevious = currentIndex > 0;

  // Update progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        const current = videoRef.current.currentTime;
        setCurrentTime(current);

        // Update watched seconds if user has progressed
        if (current > watchedSeconds) {
          setWatchedSeconds(current);
          updateProgress(current);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, watchedSeconds]);

  // Mark chapter as completed when 90% watched
  useEffect(() => {
    if (duration > 0 && currentTime >= duration * 0.9) {
      markAsCompleted();
    }
  }, [currentTime, duration]);

  const updateProgress = async (seconds: number) => {
    try {
      await fetch(`/api/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: chapter.id,
          watchedSeconds: Math.round(seconds),
        }),
      });
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  };

  const markAsCompleted = async () => {
    try {
      await fetch(`/api/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: chapter.id,
          isCompleted: true,
        }),
      });
      toast.success("Chapter completed!");
    } catch (error) {
      console.error("Failed to mark as completed:", error);
    }
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      // Resume from last watched position
      if (watchedSeconds > 0) {
        videoRef.current.currentTime = watchedSeconds;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
            {chapter.videoUrl ? (
              <video
                ref={videoRef}
                src={chapter.videoUrl}
                controls
                className="w-full h-full"
                onLoadedMetadata={handleVideoLoad}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) =>
                  setCurrentTime(e.currentTarget.currentTime)
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <VideoOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No video available</p>
                  <p className="text-sm opacity-75">
                    This chapter doesn't have a video yet
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chapter Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onPreviousChapter}
          disabled={!hasPrevious}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {chapter.userProgress?.[0]?.isCompleted && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}

          {chapter.isFree && <Badge variant="outline">Free</Badge>}
        </div>

        <Button variant="outline" onClick={onNextChapter} disabled={!hasNext}>
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Chapter Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{chapter.title}</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatVideoDuration(chapter.duration || 0)}</span>
                </div>
                <span>
                  Chapter {currentIndex + 1} of {chapters.length}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        {chapter.description && (
          <CardContent>
            <p className="text-muted-foreground">{chapter.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Other Chapters */}
      <Card>
        <CardHeader>
          <CardTitle>Course Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {chapters.map((ch, index) => {
              const isCompleted = ch.userProgress?.[0]?.isCompleted;
              const isCurrentChapter = ch.id === chapter.id;
              const isLocked = !ch.isFree && !course.isEnrolled;

              return (
                <div
                  key={ch.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    isCurrentChapter
                      ? "bg-blue-50 border border-blue-200"
                      : isCompleted
                      ? "bg-green-50 hover:bg-green-100"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => !isLocked && onChapterSelect(ch.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Chapter Status */}
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                          isCompleted
                            ? "bg-green-100 text-green-700"
                            : isCurrentChapter
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : isLocked ? (
                          <Lock className="h-3 w-3" />
                        ) : isCurrentChapter ? (
                          <Play className="h-3 w-3" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      {/* Chapter Info */}
                      <div>
                        <h4
                          className={`text-sm font-medium ${
                            isCurrentChapter ? "text-blue-700" : ""
                          }`}
                        >
                          {ch.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatVideoDuration(ch.duration || 0)}</span>
                          {ch.isFree && (
                            <Badge variant="outline" className="text-xs">
                              Free
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Play Button */}
                    {!isLocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChapterSelect(ch.id);
                        }}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

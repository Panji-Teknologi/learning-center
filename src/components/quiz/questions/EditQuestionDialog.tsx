"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  useUpdateQuestion,
  useCreateQuestionOption,
  useUpdateQuestionOption,
  useDeleteQuestionOption,
  useQuestion,
} from "@/hooks/use-quiz-management";
import { Edit, Loader2, Trash2, Check, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useQuizDialogStore } from "@/store/use-store-quiz-dialog";

// Edit Question Schema
const editQuestionSchema = z.object({
  text: z.string().min(1, "Teks pertanyaan wajib diisi"),
  type: z.enum(["MULTIPLE_CHOICE", "SINGLE_CHOICE", "TRUE_FALSE"])
    .describe("Tipe pertanyaan wajib dipilih"),
  points: z.number().min(1, "Minimal 1 poin").max(100, "Maksimal 100 poin"),
  explanation: z.string().optional(),
});

type EditQuestionFormData = z.infer<typeof editQuestionSchema>;

interface LocalOption {
  id: string;
  text: string;
  isCorrect: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
  originalId?: string;
}

const EditQuestionDialog = () => {
  const { isEditQuestionOpen, editingQuestionId, closeEditQuestionDialog } =
    useQuizDialogStore();

  const { data: question } = useQuestion(editingQuestionId || "");

  const [options, setOptions] = useState<LocalOption[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateQuestionMutation = useUpdateQuestion();
  const createOptionMutation = useCreateQuestionOption();
  const updateOptionMutation = useUpdateQuestionOption();
  const deleteOptionMutation = useDeleteQuestionOption();

  // Form setup
  const questionForm = useForm<EditQuestionFormData>({
    resolver: zodResolver(editQuestionSchema),
    defaultValues: {
      text: "",
      type: "SINGLE_CHOICE",
      points: 10,
      explanation: "",
    },
  });

  const watchedType = questionForm.watch("type");

  // Question type configuration
  const questionTypeConfig = {
    MULTIPLE_CHOICE: {
      label: "Pilihan Ganda (Banyak Jawaban)",
      needsOptions: true,
      minCorrectOptions: 1,
      maxCorrectOptions: undefined,
      icon: <Check className="h-4 w-4" />,
    },
    SINGLE_CHOICE: {
      label: "Pilihan Ganda (Satu Jawaban)",
      needsOptions: true,
      minCorrectOptions: 1,
      maxCorrectOptions: 1,
      icon: <Check className="h-4 w-4" />,
    },
    TRUE_FALSE: {
      label: "Benar/Salah",
      needsOptions: true,
      minCorrectOptions: 1,
      maxCorrectOptions: 1,
      icon: <Check className="h-4 w-4" />,
    },
  };

  // Initialize form when question changes
  useEffect(() => {
    if (question && isEditQuestionOpen) {
      questionForm.reset({
        text: question.text || "",
        type:
          (question?.type as
            | "MULTIPLE_CHOICE"
            | "SINGLE_CHOICE"
            | "TRUE_FALSE") || "SINGLE_CHOICE",
        points: question.points || 10,
        explanation: question.explanation || "",
      });

      // Initialize options
      const initialOptions: LocalOption[] =
        question.options?.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          originalId: option.id,
        })) || [];

      setOptions(initialOptions);
    }
  }, [question, isEditQuestionOpen, questionForm]);

  // Auto-generate TRUE_FALSE options when type changes
  useEffect(() => {
    if (watchedType === "TRUE_FALSE" && question?.type !== "TRUE_FALSE") {
      setOptions([
        { id: "true", text: "Benar", isCorrect: false, isNew: true },
        { id: "false", text: "Salah", isCorrect: false, isNew: true },
      ]);
    } else if (watchedType && !questionTypeConfig[watchedType]?.needsOptions) {
      setOptions([]);
    }
  }, [watchedType, question?.type]);

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;

    const newOption: LocalOption = {
      id: `new_${Date.now()}`,
      text: newOptionText.trim(),
      isCorrect: false,
      isNew: true,
    };

    setOptions([...options, newOption]);
    setNewOptionText("");
  };

  const handleRemoveOption = (optionId: string) => {
    setOptions((prev) => {
      const option = prev.find((opt) => opt.id === optionId);
      if (option?.originalId) {
        // Mark existing option as deleted
        return prev.map((opt) =>
          opt.id === optionId ? { ...opt, isDeleted: true } : opt
        );
      } else {
        // Remove new option completely
        return prev.filter((opt) => opt.id !== optionId);
      }
    });
  };

  const handleToggleCorrect = (optionId: string) => {
    const config = questionTypeConfig[watchedType];

    setOptions((prev) => {
      const updated = prev.map((option) => {
        if (option.id === optionId && !option.isDeleted) {
          return { ...option, isCorrect: !option.isCorrect };
        }

        // For SINGLE_CHOICE, uncheck others when one is checked
        if (
          config?.maxCorrectOptions === 1 &&
          option.isCorrect &&
          optionId !== option.id &&
          !option.isDeleted
        ) {
          return { ...option, isCorrect: false };
        }

        return option;
      });

      return updated;
    });
  };

  const canSubmit = () => {
    const config = questionTypeConfig[watchedType];

    if (!config?.needsOptions) {
      return questionForm.formState.isValid;
    }

    const activeOptions = options.filter((opt) => !opt.isDeleted);

    if (watchedType === "TRUE_FALSE") {
      return activeOptions.some((opt) => opt.isCorrect);
    }

    // For choice types, need at least 2 options and correct answers
    const correctCount = activeOptions.filter((opt) => opt.isCorrect).length;
    return (
      questionForm.formState.isValid &&
      activeOptions.length >= 2 &&
      correctCount >= (config.minCorrectOptions || 1) &&
      (!config.maxCorrectOptions || correctCount <= config.maxCorrectOptions)
    );
  };

  const handleSubmit = async () => {
    if (!question) return;

    const questionData = questionForm.getValues();
    setIsSubmitting(true);

    try {
      // Step 1: Update Question
      await updateQuestionMutation.mutateAsync({
        questionId: question.id,
        data: {
          text: questionData.text.trim(),
          type: questionData.type,
          points: questionData.points,
          explanation: questionData.explanation?.trim() || undefined,
        },
      });

      // Step 2: Handle Options
      const config = questionTypeConfig[questionData.type];
      if (config.needsOptions || questionData.type === "TRUE_FALSE") {
        const promises = [];

        // Delete removed options
        const deletedOptions = options.filter(
          (opt) => opt.isDeleted && opt.originalId
        );
        for (const option of deletedOptions) {
          promises.push(
            deleteOptionMutation.mutateAsync({ optionId: option.originalId! })
          );
        }

        // Update existing options
        const updatedOptions = options.filter(
          (opt) => !opt.isNew && !opt.isDeleted && opt.originalId
        );
        for (const option of updatedOptions) {
          promises.push(
            updateOptionMutation.mutateAsync({
              optionId: option.originalId!,
              data: {
                text: option.text,
                isCorrect: option.isCorrect,
              },
            })
          );
        }

        // Create new options
        const newOptions = options.filter((opt) => opt.isNew && !opt.isDeleted);
        for (const option of newOptions) {
          promises.push(
            createOptionMutation.mutateAsync({
              text: option.text,
              isCorrect: option.isCorrect,
              questionId: question.id,
            })
          );
        }

        await Promise.all(promises);
      }

      toast.success("Pertanyaan Berhasil Diupdate", {
        description: `Pertanyaan telah berhasil diperbarui.`,
      });

      handleCancel();
    } catch (error: any) {
      toast.error("Gagal Mengupdate Pertanyaan", {
        description:
          error.message || "Terjadi kesalahan saat mengupdate pertanyaan.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    questionForm.reset();
    setOptions([]);
    setNewOptionText("");
    setIsSubmitting(false);
    closeEditQuestionDialog();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
  };

  const isLoading = isSubmitting || updateQuestionMutation.isPending;
  const activeOptions = options.filter((opt) => !opt.isDeleted);

  if (!question) return null;

  return (
    <Dialog open={isEditQuestionOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Pertanyaan
          </DialogTitle>
          <DialogDescription>
            Edit pertanyaan dan pilihan jawaban. Perubahan akan mempengaruhi
            semua siswa.
          </DialogDescription>
        </DialogHeader>

        <Form {...questionForm}>
          <form className="space-y-6">
            {/* Question Text */}
            <FormField
              control={questionForm.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teks Pertanyaan *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan teks pertanyaan..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Type */}
            <FormField
              control={questionForm.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Pertanyaan *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe pertanyaan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(questionTypeConfig).map(
                        ([type, config]) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              {config.icon}
                              {config.label}
                            </div>
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Points */}
              <FormField
                control={questionForm.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poin *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Explanation */}
            <FormField
              control={questionForm.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Penjelasan (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Penjelasan untuk jawaban yang benar..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Penjelasan akan ditampilkan setelah siswa mengerjakan
                    pertanyaan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Options Section */}
            {(questionTypeConfig[watchedType]?.needsOptions ||
              watchedType === "TRUE_FALSE") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Pilihan Jawaban</h3>
                    <p className="text-sm text-muted-foreground">
                      {watchedType === "SINGLE_CHOICE" &&
                        "Pilih satu jawaban yang benar"}
                      {watchedType === "MULTIPLE_CHOICE" &&
                        "Pilih satu atau lebih jawaban yang benar"}
                      {watchedType === "TRUE_FALSE" &&
                        "Pilih jawaban yang benar"}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {activeOptions.length} pilihan
                  </Badge>
                </div>

                {/* Existing Options */}
                <div className="space-y-2">
                  {activeOptions.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <Checkbox
                        checked={option.isCorrect}
                        onCheckedChange={() => handleToggleCorrect(option.id)}
                      />
                      <Input
                        value={option.text}
                        onChange={(e) => {
                          const newText = e.target.value;
                          setOptions((prev) =>
                            prev.map((opt) =>
                              opt.id === option.id
                                ? { ...opt, text: newText }
                                : opt
                            )
                          );
                        }}
                        className="flex-1"
                        placeholder="Teks pilihan jawaban..."
                      />
                      {watchedType !== "TRUE_FALSE" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(option.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New Option */}
                {watchedType !== "TRUE_FALSE" && (
                  <div className="flex gap-2">
                    <Input
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      placeholder="Tambah pilihan baru..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddOption}
                      disabled={!newOptionText.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                Update Pertanyaan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditQuestionDialog;

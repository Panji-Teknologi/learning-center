"use client";

import React, { useState } from "react";
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
  useCreateQuestion,
  useCreateQuestionOption,
} from "@/hooks/use-quiz-management";
import {
  Plus,
  Loader2,
  HelpCircle,
  Hash,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Check,
} from "lucide-react";
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

// Step 1 Schema - Question Details
const questionSchema = z.object({
  text: z.string().min(1, "Teks pertanyaan wajib diisi"),
  type: z.enum(["SINGLE_CHOICE", "TRUE_FALSE"])
    .describe("Tipe pertanyaan wajib dipilih"),
  points: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    return Number(val);
  },
  z.number()
    .min(1, "Minimal 1 poin")
    .max(100, "Maksimal 100 poin")
    .optional()),

  explanation: z.string().optional(),
});



type QuestionFormData = z.infer<typeof questionSchema>;

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

const CreateQuestionDialog: React.FC = () => {
  const {
    isCreateQuestionOpen,
    createQuestionQuizId,
    closeCreateQuestionDialog,
  } = useQuizDialogStore();
  const createQuestionMutation = useCreateQuestion();
  const createQuestionOptionMutation = useCreateQuestionOption();

  // Stepper state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Question options state
  const [options, setOptions] = useState<QuestionOption[]>([]);
  const [newOptionText, setNewOptionText] = useState("");

  // Forms
  const questionForm = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    mode: "onChange",          // <- penting
    reValidateMode: "onChange",
    defaultValues: {
      text: "",
      type: "SINGLE_CHOICE",
      points: undefined as unknown as number,
      explanation: "",
    },
  });


  const watchedType = questionForm.watch("type");

  // Question type configurations
  const questionTypeConfig = {
    SINGLE_CHOICE: {
      label: "Pilihan Ganda (Satu Jawaban)",
      description: "Siswa hanya dapat memilih satu jawaban yang benar",
      needsOptions: true,
      minCorrectOptions: 1,
      maxCorrectOptions: 1,
    },
    TRUE_FALSE: {
      label: "Benar/Salah",
      description: "Pertanyaan dengan jawaban Benar atau Salah",
      needsOptions: false, // Will auto-generate
      minCorrectOptions: 1,
      maxCorrectOptions: undefined,
    },
    // TEXT: {
    //   label: "Teks Bebas",
    //   description: "Jawaban berupa teks bebas",
    //   needsOptions: false,
    //   minCorrectOptions: 1,
    //   maxCorrectOptions: undefined,
    // },
    // NUMBER: {
    //   label: "Angka",
    //   description: "Jawaban berupa angka/bilangan",
    //   needsOptions: false,
    //   minCorrectOptions: 1,
    //   maxCorrectOptions: undefined,
    // },
  };

  // Reset all states when dialog opens/closes
  React.useEffect(() => {
    if (isCreateQuestionOpen) {
      setCurrentStep(1);
      setOptions([]);
      setNewOptionText("");
      setIsSubmitting(false);

      questionForm.reset({
        text: "",
        type: "SINGLE_CHOICE",
        points: undefined as unknown as number, // kosong
        explanation: "",
      });
    }
  }, [isCreateQuestionOpen]);


  // Auto-generate TRUE_FALSE options when type changes
  React.useEffect(() => {
    if (watchedType === "TRUE_FALSE") {
      setOptions([
        { id: "true", text: "Benar", isCorrect: false },
        { id: "false", text: "Salah", isCorrect: false },
      ]);
    } else if (watchedType && !questionTypeConfig[watchedType]?.needsOptions) {
      setOptions([]);
    }
  }, [watchedType]);

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;

    const newOption: QuestionOption = {
      id: Date.now().toString(),
      text: newOptionText.trim(),
      isCorrect: false,
    };

    setOptions([...options, newOption]);
    setNewOptionText("");
  };

  const handleRemoveOption = (optionId: string) => {
    setOptions(options.filter((option) => option.id !== optionId));
  };

  const handleToggleCorrect = (optionId: string) => {
    const config = questionTypeConfig[watchedType];

    setOptions((prev) => {
      const updated = prev.map((option) => {
        if (option.id === optionId) {
          return { ...option, isCorrect: !option.isCorrect };
        }

        // For SINGLE_CHOICE, uncheck others when one is checked
        if (
          config?.maxCorrectOptions === 1 &&
          option.isCorrect &&
          optionId !== option.id
        ) {
          return { ...option, isCorrect: false };
        }

        return option;
      });

      return updated;
    });
  };

  const canGoToStep2 = () => {
    const questionData = questionForm.getValues();
    const isQuestionValid =
      questionForm.formState.isValid && questionData.text && questionData.type;
    return isQuestionValid;
  };

  const canSubmit = () => {
    const config = questionTypeConfig[watchedType];

    if (!config?.needsOptions) {
      return true; // TEXT, NUMBER don't need options
    }

    if (watchedType === "TRUE_FALSE") {
      return options.some((opt) => opt.isCorrect); // At least one correct
    }

    // For choice types, need at least 2 options and correct answers
    const correctCount = options.filter((opt) => opt.isCorrect).length;
    return (
      options.length >= 2 &&
      correctCount >= (config.minCorrectOptions || 1) &&
      (!config.maxCorrectOptions || correctCount <= config.maxCorrectOptions)
    );
  };

  const handleNextStep = () => {
    if (canGoToStep2()) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  // const handleSubmit = async () => {
  //   if (!createQuestionQuizId) {
  //     toast.error("Quiz ID tidak ditemukan");
  //     return;
  //   }

  //   const questionData = questionForm.getValues();
  //   setIsSubmitting(true);

  //   try {
  //     // Step 1: Create Question
  //     const question = await createQuestionMutation.mutateAsync({
  //       text: questionData.text.trim(),
  //       type: questionData.type,
  //       points: questionData.points,
  //       explanation: questionData.explanation?.trim() || undefined,
  //       quizId: createQuestionQuizId,
  //     });

  //     // Step 2: Create Options (if needed)
  //     const config = questionTypeConfig[questionData.type];
  //     if (config.needsOptions || questionData.type === "TRUE_FALSE") {
  //       const optionPromises = options.map((option) =>
  //         createQuestionOptionMutation.mutateAsync({
  //           text: option.text,
  //           isCorrect: option.isCorrect,
  //           questionId: question.id,
  //         })
  //       );

  //       await Promise.all(optionPromises);
  //     }

  //     toast.success("Pertanyaan Berhasil Dibuat", {
  //       description: `Pertanyaan dengan ${questionData.points} poin dan ${options.length} pilihan telah berhasil dibuat.`,
  //     });

  //     handleCancel();
  //   } catch (error: any) {
  //     toast.error("Gagal Membuat Pertanyaan", {
  //       description:
  //         error.message || "Terjadi kesalahan saat membuat pertanyaan.",
  //     });
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

const onCreateQuestion = async (values: QuestionFormData) => {
  if (!createQuestionQuizId) {
    toast.error("Quiz ID tidak ditemukan");
    return;
  }

  setIsSubmitting(true);
  try {
    // values.points sudah number karena diproses Zod (preprocess)
    const question = await createQuestionMutation.mutateAsync({
      text: values.text.trim(),
      type: values.type,
      points: values.points ?? 1,
      explanation: values.explanation?.trim() || undefined,
      quizId: createQuestionQuizId,
    });

    const config = questionTypeConfig[values.type];
    if (config.needsOptions || values.type === "TRUE_FALSE") {
      await Promise.all(
        options.map((option) =>
          createQuestionOptionMutation.mutateAsync({
            text: option.text.trim(),
            isCorrect: !!option.isCorrect,
            questionId: question.id,
          })
        )
      );
    }

    toast.success("Pertanyaan Berhasil Dibuat", {
      description: `Pertanyaan dengan ${values.points} poin dan ${options.length} pilihan telah berhasil dibuat.`,
    });

    handleCancel();
  } catch (error: any) {
    // Hindari parsing JSON dari response non-JSON
    const desc =
      error?.message?.includes("JSON") ? "Server mengembalikan error non-JSON (500). Cek payload & log server." :
      error?.message || "Terjadi kesalahan saat membuat pertanyaan.";
    toast.error("Gagal Membuat Pertanyaan", { description: desc });
  } finally {
    setIsSubmitting(false);
  }
};

  const handleCancel = () => {
    questionForm.reset();
    setOptions([]);
    setNewOptionText("");
    setCurrentStep(1);
    setIsSubmitting(false);
    closeCreateQuestionDialog();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
  };

  const isLoading = isSubmitting || createQuestionMutation.isPending;

  return (
    <Dialog open={isCreateQuestionOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Buat Pertanyaan Baru
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1
              ? "Langkah 1: Tentukan detail pertanyaan dan tipe soal"
              : "Langkah 2: Tambahkan pilihan jawaban untuk pertanyaan"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {currentStep > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <div
              className={`h-0.5 w-16 ${
                currentStep >= 2 ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 2
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              2
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Question Details */}
          {currentStep === 1 && (
            <Form {...questionForm}>
              <div className="space-y-6">
                {/* Question Text */}
                <FormField
                  control={questionForm.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Teks Pertanyaan <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Masukkan teks pertanyaan..."
                          disabled={isLoading}
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Buat pertanyaan yang jelas dan mudah dipahami oleh
                        siswa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Question Type and Points */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Question Type */}
                  <FormField
                    control={questionForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <HelpCircle className="h-4 w-4" />
                          Tipe Pertanyaan{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih tipe pertanyaan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(questionTypeConfig).map(
                              ([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  {config.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        {watchedType && (
                          <FormDescription className="text-xs">
                            {questionTypeConfig[watchedType]?.description}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Points */}
                  <FormField
                    control={questionForm.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Hash className="h-4 w-4" />
                          Poin <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Masukkan poin"
                            disabled={isLoading}
                            value={questionForm.watch("points") ?? ""}
                            onChange={(e) =>
                              questionForm.setValue("points", e.target.value as any, {
                                shouldValidate: true,   // <- kunci
                                shouldDirty: true,
                                shouldTouch: true,
                              })
                            }
                            onFocus={(e) => e.currentTarget.select()}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Poin yang akan diperoleh jika jawaban benar (1–100)
                        </FormDescription>
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
                          disabled={isLoading}
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Penjelasan ini akan ditampilkan kepada siswa setelah
                        mereka menjawab.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          )}

          {/* Step 2: Question Options */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Current Question Preview */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="font-medium mb-2">Preview Pertanyaan:</h4>
                <p className="text-sm text-gray-700 mb-2">
                  {questionForm.getValues("text")}
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {questionTypeConfig[watchedType]?.label}
                  </Badge>
                  <Badge variant="outline">
                    {questionForm.getValues("points")} poin
                  </Badge>
                </div>
              </div>

              {/* Options Management for Choice Types */}
              {questionTypeConfig[watchedType]?.needsOptions && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Pilihan Jawaban</h4>
                    <Badge variant="outline">
                      {options.filter((opt) => opt.isCorrect).length} benar dari{" "}
                      {options.length} pilihan
                    </Badge>
                  </div>

                  {/* Add New Option */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tambah pilihan jawaban..."
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddOption()}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      onClick={handleAddOption}
                      disabled={!newOptionText.trim() || isLoading}
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {options.map((option, index) => (
                      <div
                        key={option.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          option.isCorrect
                            ? "bg-green-50 border-green-200"
                            : "bg-white"
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            checked={option.isCorrect}
                            onCheckedChange={() =>
                              handleToggleCorrect(option.id)
                            }
                            disabled={isLoading}
                          />
                          <span className="text-sm flex-1">{option.text}</span>
                          {option.isCorrect && (
                            <Badge className="bg-green-100 text-green-800">
                              Benar
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(option.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Validation Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">📋 Persyaratan:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Minimal 2 pilihan jawaban</li>
                        <li>• Minimal 1 jawaban yang benar</li>
                        {questionTypeConfig[watchedType]?.maxCorrectOptions ===
                          1 && (
                          <li>
                            • Maksimal 1 jawaban yang benar (pilihan ganda
                            tunggal)
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-generated TRUE_FALSE options */}
              {watchedType === "TRUE_FALSE" && (
                <div className="space-y-4">
                  <h4 className="font-medium">Pilihan Jawaban (Otomatis)</h4>
                  <div className="space-y-2">
                    {options.map((option) => (
                      <div
                        key={option.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          option.isCorrect
                            ? "bg-green-50 border-green-200"
                            : "bg-white"
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            checked={option.isCorrect}
                            onCheckedChange={() =>
                              handleToggleCorrect(option.id)
                            }
                            disabled={isLoading}
                          />
                          <span className="text-sm flex-1">{option.text}</span>
                          {option.isCorrect && (
                            <Badge className="bg-green-100 text-green-800">
                              Jawaban Benar
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    Pilih jawaban yang benar untuk pertanyaan ini.
                  </p>
                </div>
              )}

              {/* No options needed info */}
              {!questionTypeConfig[watchedType]?.needsOptions &&
                watchedType !== "TRUE_FALSE" && (
                  <div className="bg-gray-50 border rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">
                      Tipe pertanyaan{" "}
                      <strong>{questionTypeConfig[watchedType]?.label}</strong>{" "}
                      tidak memerlukan pilihan jawaban. Siswa akan mengisi
                      jawaban secara manual.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Batal
          </Button>

          {currentStep === 1 && (
            <Button
              type="button"
              onClick={questionForm.handleSubmit(() => setCurrentStep(2))} // validasi skema dulu
              disabled={isLoading || !questionForm.formState.isValid}
              className="gap-2"
            >
              Selanjutnya
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {currentStep === 2 && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={isLoading}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <Button
                type="button"
                onClick={questionForm.handleSubmit(onCreateQuestion)} // <— ini kuncinya
                disabled={!canSubmit() || isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Buat Pertanyaan
                  </>
                )}
              </Button>

            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuestionDialog;

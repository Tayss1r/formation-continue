"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Plus,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import {
  assignProfessorsToCohort,
  createCohort,
  getAvailableProfessorsForCohort,
  getCohortFormOptions,
  getCoordinatorCohorts,
} from "@/lib/cohorts";
import type {
  Cohort,
  CohortFormCallOption,
  CohortFormCourseOption,
  CohortProfessor,
} from "@/types/cohort";

interface CohortFormState {
  name: string;
  call_id: string;
  course_id: string;
  training_start_date: string;
  training_end_date: string;
  daily_start_hour: string;
  daily_end_hour: string;
}

const initialForm: CohortFormState = {
  name: "",
  call_id: "",
  course_id: "",
  training_start_date: "",
  training_end_date: "",
  daily_start_hour: "09:00",
  daily_end_hour: "17:00",
};

function addOneDay(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function maxIsoDate(a: string, b: string): string {
  return a > b ? a : b;
}

export default function CoordinatorCohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [calls, setCalls] = useState<CohortFormCallOption[]>([]);
  const [courses, setCourses] = useState<CohortFormCourseOption[]>([]);

  const [form, setForm] = useState<CohortFormState>(initialForm);

  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [availableProfessors, setAvailableProfessors] = useState<CohortProfessor[]>([]);
  const [selectedProfessorIds, setSelectedProfessorIds] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCohort, setIsSavingCohort] = useState(false);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);
  const [isLoadingProfessors, setIsLoadingProfessors] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadPageData();
  }, []);

  const selectedCohort = useMemo(
    () => cohorts.find((cohort) => cohort.id === selectedCohortId) || null,
    [cohorts, selectedCohortId]
  );

  const selectedCall = useMemo(
    () => calls.find((call) => String(call.id) === form.call_id) || null,
    [calls, form.call_id]
  );

  const todayIsoDate = useMemo(() => getTodayIsoDate(), []);

  const earliestAllowedStartDate = useMemo(() => {
    const fromToday = todayIsoDate;
    if (!selectedCall?.results_publication_date) return fromToday;
    return maxIsoDate(fromToday, addOneDay(selectedCall.results_publication_date));
  }, [selectedCall, todayIsoDate]);

  const earliestAllowedEndDate = useMemo(() => {
    const fromToday = todayIsoDate;
    if (form.training_start_date) {
      return maxIsoDate(fromToday, addOneDay(form.training_start_date));
    }
    return earliestAllowedStartDate;
  }, [form.training_start_date, earliestAllowedStartDate, todayIsoDate]);

  async function loadPageData() {
    setIsLoading(true);
    setError(null);
    try {
      const [cohortRes, optionsRes] = await Promise.all([
        getCoordinatorCohorts(),
        getCohortFormOptions(),
      ]);
      setCohorts(cohortRes.cohorts);
      setCalls(optionsRes.calls);
      setCourses(optionsRes.courses);

      if (cohortRes.cohorts.length > 0 && selectedCohortId === null) {
        void openAssignmentPanel(cohortRes.cohorts[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Erreur lors du chargement des cohortes"));
    } finally {
      setIsLoading(false);
    }
  }

  function getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === "object" && "message" in err) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
    if (err && typeof err === "object" && "detail" in err) {
      const detail = (err as { detail?: unknown }).detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
    }
    return fallback;
  }

  function validateForm(): string | null {
    if (!form.name.trim()) return "Le nom du cohort est requis";
    if (!form.call_id) return "Selectionnez un appel";
    if (!form.course_id) return "Selectionnez une formation";
    if (!form.training_start_date) return "La date de debut est requise";
    if (!form.training_end_date) return "La date de fin est requise";
    if (!form.daily_start_hour || !form.daily_end_hour) {
      return "Les heures journalieres sont requises";
    }

    if (form.training_end_date < form.training_start_date) {
      return "La date de fin doit etre apres la date de debut";
    }

    if (form.training_end_date === form.training_start_date) {
      return "La date de debut doit etre strictement avant la date de fin";
    }

    if (selectedCall?.results_publication_date) {
      if (form.training_start_date <= selectedCall.results_publication_date) {
        return "La date de debut doit etre apres la publication des resultats";
      }
      if (form.training_end_date <= selectedCall.results_publication_date) {
        return "La date de fin doit etre apres la publication des resultats";
      }
    }

    if (form.daily_end_hour <= form.daily_start_hour) {
      return "L'heure de fin doit etre apres l'heure de debut";
    }

    return null;
  }

  async function handleCreateCohort() {
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setIsSavingCohort(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await createCohort({
        name: form.name.trim(),
        call_id: Number(form.call_id),
        course_id: Number(form.course_id),
        training_start_date: form.training_start_date,
        training_end_date: form.training_end_date,
        daily_start_hour: form.daily_start_hour,
        daily_end_hour: form.daily_end_hour,
      });

      setForm(initialForm);
      await loadPageData();
      setSuccessMessage("Cohort cree avec succes");
    } catch (err) {
      setError(getErrorMessage(err, "Erreur lors de la creation du cohort"));
    } finally {
      setIsSavingCohort(false);
    }
  }

  async function openAssignmentPanel(cohort: Cohort) {
    setSelectedCohortId(cohort.id);
    setSelectedProfessorIds(cohort.professors.map((professor) => professor.id));
    setIsLoadingProfessors(true);
    setError(null);

    try {
      const professors = await getAvailableProfessorsForCohort(cohort.id);
      setAvailableProfessors(professors);
    } catch (err) {
      setError(getErrorMessage(err, "Impossible de charger la liste des professeurs"));
      setAvailableProfessors([]);
    } finally {
      setIsLoadingProfessors(false);
    }
  }

  function toggleProfessor(professorId: number) {
    setSelectedProfessorIds((previous) =>
      previous.includes(professorId)
        ? previous.filter((id) => id !== professorId)
        : [...previous, professorId]
    );
  }

  async function saveAssignments() {
    if (!selectedCohortId) return;

    setIsSavingAssignments(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await assignProfessorsToCohort(selectedCohortId, {
        professor_ids: selectedProfessorIds,
      });
      await loadPageData();
      setSuccessMessage("Professeurs assignes avec succes");
    } catch (err) {
      setError(getErrorMessage(err, "Erreur lors de l'assignation des professeurs"));
    } finally {
      setIsSavingAssignments(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-display text-2xl text-foreground">Cohorts</h1>
        <p className="text-muted-foreground">
          Creez un cohort apres publication des resultats et assignez les professeurs.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="card-elevated p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-foreground">Creer un Cohort</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nom du cohort</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="form-input w-full"
              placeholder="Ex: Cohort Printemps 2026"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Appel associe</label>
              <select
                value={form.call_id}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    call_id: event.target.value,
                    training_start_date: "",
                    training_end_date: "",
                  }))
                }
                className="form-select w-full"
              >
                <option value="">Selectionner</option>
                {calls.map((call) => (
                  <option key={call.id} value={call.id}>
                    {call.reference_number} - {call.title}
                  </option>
                ))}
              </select>
              {selectedCall?.results_publication_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  Resultats publies le {selectedCall.results_publication_date}. La formation doit commencer apres cette date.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Formation associee</label>
              <select
                value={form.course_id}
                onChange={(event) => setForm((prev) => ({ ...prev, course_id: event.target.value }))}
                className="form-select w-full"
              >
                <option value="">Selectionner</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Date debut</label>
              <input
                type="date"
                value={form.training_start_date}
                min={earliestAllowedStartDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, training_start_date: event.target.value }))
                }
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Date fin</label>
              <input
                type="date"
                value={form.training_end_date}
                min={earliestAllowedEndDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, training_end_date: event.target.value }))
                }
                className="form-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Heure de debut quotidienne
              </label>
              <input
                type="time"
                value={form.daily_start_hour}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, daily_start_hour: event.target.value }))
                }
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Heure de fin quotidienne
              </label>
              <input
                type="time"
                value={form.daily_end_hour}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, daily_end_hour: event.target.value }))
                }
                className="form-input w-full"
              />
            </div>
          </div>

          <button
            onClick={handleCreateCohort}
            disabled={isSavingCohort}
            className="btn-primary inline-flex items-center justify-center gap-2 w-full"
          >
            {isSavingCohort ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Creer le cohort
          </button>
        </section>

        <section className="card-elevated p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-foreground">Cohortes existants</h2>
          </div>

          {cohorts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun cohort pour le moment. Creez votre premier cohort pour demarrer la phase de formation.
            </p>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {cohorts.map((cohort) => {
                const isSelected = selectedCohortId === cohort.id;
                return (
                  <button
                    key={cohort.id}
                    onClick={() => void openAssignmentPanel(cohort)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      isSelected
                        ? "border-primary-300 bg-primary-50/50 dark:bg-primary-900/20"
                        : "border-border hover:border-primary-200"
                    }`}
                  >
                    <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                      {cohort.call_reference_number}
                    </p>
                    <p className="font-semibold text-foreground mt-0.5">{cohort.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{cohort.course_title}</p>
                    <div className="text-xs text-muted-foreground mt-2">
                      {cohort.training_start_date} - {cohort.training_end_date} | {cohort.daily_start_hour} - {cohort.daily_end_hour}
                    </div>
                    <div className="text-xs mt-2 text-muted-foreground">
                      {cohort.professors.length} professeur(s) assigne(s)
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="card-elevated p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-foreground">Assigner les professeurs au Cohort</h2>
        </div>

        {!selectedCohort ? (
          <p className="text-sm text-muted-foreground">Selectionnez un cohort pour commencer l'assignation.</p>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <p className="font-medium text-foreground">{selectedCohort.name}</p>
              <p className="text-sm text-muted-foreground">{selectedCohort.call_title} - {selectedCohort.course_title}</p>
            </div>

            {isLoadingProfessors ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement des professeurs...
              </div>
            ) : availableProfessors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun professeur disponible.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableProfessors.map((professor) => {
                  const checked = selectedProfessorIds.includes(professor.id);
                  return (
                    <label
                      key={professor.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        checked
                          ? "border-primary-300 bg-primary-50/50 dark:bg-primary-900/20"
                          : "border-border hover:border-primary-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleProfessor(professor.id)}
                      />
                      <div>
                        <p className="font-medium text-foreground">{professor.fullname}</p>
                        <p className="text-sm text-muted-foreground">{professor.specialization}</p>
                        <p className="text-xs text-muted-foreground">{professor.email}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <button
              onClick={saveAssignments}
              disabled={isSavingAssignments || isLoadingProfessors}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              {isSavingAssignments ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Enregistrer les assignations
            </button>
          </>
        )}
      </section>
    </div>
  );
}

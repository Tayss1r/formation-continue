"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Search,
  Clock,
  User,
  Building2,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Send,
  Filter,
  ChevronDown,
  Activity,
} from "lucide-react";
import { getRecentActivity } from "@/lib/coordinator";
import { SearchInput, FilterSelect, TableSkeleton, EmptyState } from "@/components/coordinator/CoordinatorUI";
import type { RecentActivityItem } from "@/types/coordinator";
import { formatActivityLabel, ENTITY_TYPE_LABELS } from "@/types/coordinator";

interface ActivityItem extends RecentActivityItem {
  target_name?: string;
}

const actionTypeOptions = [
  { value: 'create', label: 'Création' },
  { value: 'update', label: 'Modification' },
  { value: 'delete', label: 'Suppression' },
  { value: 'publish', label: 'Publication' },
  { value: 'close', label: 'Fermeture' },
  { value: 'start_review', label: 'Examen' },
  { value: 'publish_results', label: 'Résultats publiés' },
  { value: 'approve', label: 'Approbation' },
  { value: 'reject', label: 'Rejet' },
  { value: 'submit', label: 'Soumission' },
];

const targetTypeOptions = [
  { value: 'CallForApplicants', label: 'Appels' },
  { value: 'CompanyApplication', label: 'Candidatures' },
  { value: 'EmployeeSubmission', label: 'Soumissions' },
];

const periodOptions = [
  { value: '7', label: '7 derniers jours' },
  { value: '30', label: '30 derniers jours' },
  { value: '90', label: '3 derniers mois' },
  { value: '365', label: 'Dernière année' },
];

function getActionIcon(action: string) {
  // Extract verb from dot-notation ("call.publish" → "publish")
  const verb = action.includes('.') ? action.split('.')[1] : action;
  switch (verb) {
    case 'create':
      return <Plus className="w-4 h-4 text-green-500" />;
    case 'update':
    case 'edit':
      return <Edit className="w-4 h-4 text-blue-500" />;
    case 'delete':
      return <Trash2 className="w-4 h-4 text-red-500" />;
    case 'publish':
    case 'publish_results':
      return <Send className="w-4 h-4 text-primary-500" />;
    case 'close':
      return <XCircle className="w-4 h-4 text-orange-500" />;
    case 'start_review':
      return <Eye className="w-4 h-4 text-purple-500" />;
    case 'approve':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'reject':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'submit':
      return <FileText className="w-4 h-4 text-blue-500" />;
    case 'reopen':
      return <Activity className="w-4 h-4 text-teal-500" />;
    default:
      return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
}

function getTargetIcon(targetType: string) {
  // Handles PascalCase ("CallForApplicants") and plain keys
  const key = targetType.toLowerCase();
  if (key.includes('call')) return <FileText className="w-4 h-4" />;
  if (key.includes('application')) return <Building2 className="w-4 h-4" />;
  if (key.includes('submission')) return <User className="w-4 h-4" />;
  if (key.includes('document')) return <FileText className="w-4 h-4" />;
  return <Activity className="w-4 h-4" />;
}

function formatTargetType(targetType: string) {
  return ENTITY_TYPE_LABELS[targetType] || targetType;
}

function getRelativeTime(date: string) {
  const now = new Date();
  const activityDate = new Date(date);
  const diffMs = now.getTime() - activityDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return activityDate.toLocaleDateString('fr-FR');
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("30");
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    fetchActivities();
  }, [periodFilter]);

  useEffect(() => {
    filterActivities();
  }, [activities, searchQuery, actionFilter, targetFilter]);

  async function fetchActivities() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecentActivity(parseInt(periodFilter, 10), 200);
      // Map API response to local ActivityItem interface
      const mapped: ActivityItem[] = (data.activities || []).map(act => ({
        ...act,
        target_name: act.entity_id
          ? `${formatTargetType(act.entity_type)} #${act.entity_id}`
          : undefined,
      }));
      setActivities(mapped);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError("Erreur lors du chargement de l'historique");
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }

  function filterActivities() {
    let filtered = [...activities];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (act) =>
          act.target_name?.toLowerCase().includes(query) ||
          act.notes?.toLowerCase().includes(query) ||
          formatActivityLabel(act.action, act.entity_type).toLowerCase().includes(query)
      );
    }
    
    if (actionFilter) {
      // Match on the verb part of dot-notation ("call.publish" → "publish")
      filtered = filtered.filter((act) => {
        const verb = act.action.includes('.') ? act.action.split('.')[1] : act.action;
        return verb === actionFilter;
      });
    }
    
    if (targetFilter) {
      filtered = filtered.filter((act) => act.entity_type === targetFilter);
    }
    
    setFilteredActivities(filtered);
    setVisibleCount(20);
  }

  // Group activities by date
  function groupByDate(items: ActivityItem[]) {
    const groups: Record<string, ActivityItem[]> = {};
    
    items.forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    
    return groups;
  }

  const visibleActivities = filteredActivities.slice(0, visibleCount);
  const groupedActivities = groupByDate(visibleActivities);
  const hasMore = visibleCount < filteredActivities.length;

  // Stats
  const today = new Date().toDateString();
  const todayCount = activities.filter(
    (a) => new Date(a.created_at).toDateString() === today
  ).length;
  
  const actionCounts = activities.reduce((acc, act) => {
    acc[act.action] = (acc[act.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="flex gap-4">
          <div className="h-12 bg-muted rounded flex-1 animate-pulse" />
          <div className="h-12 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-foreground">
            Historique d'Activité
          </h1>
          <p className="text-muted-foreground">
            Suivez toutes les actions effectuées dans votre espace coordinateur
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{todayCount}</p>
          <p className="text-sm text-muted-foreground">actions aujourd'hui</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-amber-700 dark:text-amber-400 text-sm">{error}</p>
          <button
            onClick={fetchActivities}
            className="ml-auto text-sm text-amber-600 hover:text-amber-700 font-medium whitespace-nowrap"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="hidden sm:grid grid-cols-4 gap-4">
        <div className="card-elevated p-4 text-center">
          <p className="text-xl font-bold text-foreground">{activities.length}</p>
          <p className="text-xs text-muted-foreground">Total ({periodFilter}j)</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-xl font-bold text-green-600">{actionCounts['approve'] || 0}</p>
          <p className="text-xs text-muted-foreground">Approbations</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-xl font-bold text-primary-600">{actionCounts['publish'] || 0}</p>
          <p className="text-xs text-muted-foreground">Publications</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-xl font-bold text-blue-600">{actionCounts['create'] || 0}</p>
          <p className="text-xs text-muted-foreground">Créations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher une activité..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                showFilters || actionFilter || targetFilter
                  ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtres
              {(actionFilter || targetFilter) && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                  {(actionFilter ? 1 : 0) + (targetFilter ? 1 : 0)}
                </span>
              )}
            </button>
            <div className="w-48">
              <FilterSelect
                value={periodFilter}
                onChange={setPeriodFilter}
                options={periodOptions}
                placeholder="Période"
              />
            </div>
          </div>
        </div>
        
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-xl animate-fade-up">
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Type d'action
              </label>
              <FilterSelect
                value={actionFilter}
                onChange={setActionFilter}
                options={actionTypeOptions}
                placeholder="Toutes les actions"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Type d'élément
              </label>
              <FilterSelect
                value={targetFilter}
                onChange={setTargetFilter}
                options={targetTypeOptions}
                placeholder="Tous les éléments"
              />
            </div>
            {(actionFilter || targetFilter) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setActionFilter('');
                    setTargetFilter('');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Réinitialiser
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      {filteredActivities.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-8 h-8 text-muted-foreground" />}
          title={activities.length === 0 ? "Aucune activité" : "Aucun résultat"}
          description={
            activities.length === 0
              ? "Aucune activité enregistrée pour cette période."
              : "Aucune activité ne correspond à vos critères."
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 mb-4">
                <h2 className="text-sm font-medium text-muted-foreground capitalize">
                  {date}
                </h2>
              </div>
              
              <div className="space-y-2 relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border hidden sm:block" />
                
                {items.map((activity, idx) => (
                  <div
                    key={activity.id}
                    className="card-elevated p-4 sm:ml-10 relative group hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    {/* Timeline dot */}
                    <div className="hidden sm:flex absolute -left-10 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border-2 border-border group-hover:border-primary-500 transition-colors" />
                    
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-muted flex-shrink-0">
                        {getActionIcon(activity.action)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {formatActivityLabel(activity.action, activity.entity_type)}
                            </p>
                            {activity.target_name && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {activity.target_name}
                              </p>
                            )}
                            {activity.notes && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {activity.notes}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getRelativeTime(activity.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        {activity.user_id && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                            <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <User className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Utilisateur #{activity.user_id}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="btn-secondary inline-flex items-center gap-2"
              >
                Charger plus
                <ChevronDown className="w-4 h-4" />
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                {visibleCount} sur {filteredActivities.length} activités affichées
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

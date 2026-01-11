import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Tag, Activity, Clock, Wrench, Package, Layers, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/useToast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

import {
  SubCategory,
  getSubCategoryStatistics,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory
} from '@/api/subCategories';
import { getCategories, Category } from '@/api/categories';
import { useAuth } from "@/contexts/AuthContext";

const SubCategories = () => {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'name' | 'assets' | 'availability'>('name');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [currentSubCategory, setCurrentSubCategory] = useState<SubCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', categoryId: '' });

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subCategoriesData, categoriesData] = await Promise.all([
        getSubCategoryStatistics(),
        getCategories()
      ]);
      setSubCategories(subCategoriesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch sub-categories.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSubCategories = useMemo(() => {
    let result = subCategories;

    // Filter by Category
    if (categoryFilter !== 'all') {
      result = result.filter(sc => sc.category?._id === categoryFilter);
    }

    // Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(sc =>
        sc.name.toLowerCase().includes(lowerQuery) ||
        (sc.description && sc.description.toLowerCase().includes(lowerQuery)) ||
        (sc.category?.name && sc.category.name.toLowerCase().includes(lowerQuery))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'assets') {
        return (b.statistics?.totalAssets || 0) - (a.statistics?.totalAssets || 0);
      } else if (sortBy === 'availability') {
        return (b.statistics?.avgAvailability || 0) - (a.statistics?.avgAvailability || 0);
      }
      return 0;
    });

    return result;
  }, [subCategories, searchQuery, categoryFilter, sortBy]);

  // Global Statistics Calculation
  const globalStats = useMemo(() => {
    const totalSubCategories = subCategories.length;
    const totalAssets = subCategories.reduce((sum, sc) => sum + (sc.statistics?.totalAssets || 0), 0);
    const totalOnline = subCategories.reduce((sum, sc) => sum + (sc.statistics?.statusBreakdown?.in_production || 0), 0);
    const totalMaintenance = subCategories.reduce((sum, sc) => sum + (sc.statistics?.statusBreakdown?.maintenance || 0), 0);
    const totalBreakdown = subCategories.reduce((sum, sc) => sum + (sc.statistics?.statusBreakdown?.breakdown || 0), 0);

    // Average Availability weighted by asset count could be better, but simple average for now
    const avgAvailability = subCategories.length > 0
      ? subCategories.reduce((sum, sc) => sum + (sc.statistics?.avgAvailability || 0), 0) / subCategories.length
      : 0;

    return {
      totalSubCategories,
      totalAssets,
      totalOnline,
      totalMaintenance,
      totalBreakdown,
      avgAvailability: Math.round(avgAvailability * 100) / 100
    };
  }, [subCategories]);

  const handleCreate = async () => {
    try {
      if (!formData.categoryId) {
        toast({ title: 'Error', description: 'Category is required', variant: 'destructive' });
        return;
      }
      await createSubCategory(formData);
      toast({
        title: 'Success',
        description: 'Sub-Category created successfully.',
      });
      setIsCreateOpen(false);
      setFormData({ name: '', description: '', categoryId: '' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create sub-category.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!currentSubCategory) return;
    try {
      await updateSubCategory(currentSubCategory._id, {
        name: formData.name,
        description: formData.description
      });
      toast({
        title: 'Success',
        description: 'Sub-Category updated successfully.',
      });
      setIsEditOpen(false);
      setCurrentSubCategory(null);
      setFormData({ name: '', description: '', categoryId: '' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update sub-category.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!currentSubCategory) return;
    try {
      await deleteSubCategory(currentSubCategory._id);
      toast({
        title: 'Success',
        description: 'Sub-Category deleted successfully.',
      });
      setIsDeleteOpen(false);
      setCurrentSubCategory(null);
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete sub-category.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (subCategory: SubCategory) => {
    setCurrentSubCategory(subCategory);
    setFormData({
      name: subCategory.name,
      description: subCategory.description || '',
      categoryId: subCategory.category?._id || ''
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (subCategory: SubCategory) => {
    setCurrentSubCategory(subCategory);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Sub-Categories</h1>
          <p className="text-muted-foreground">Manage asset sub-categories (formerly Types) and view statistics.</p>
        </div>
        <div className="flex items-center gap-2">

          {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
            <Button onClick={() => { setIsCreateOpen(true); setFormData({ name: '', description: '', categoryId: '' }); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Sub-Category
            </Button>
          )}
        </div>
      </div>

      {/* Global KPI Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-700 font-medium">Total Sub-Categories</CardDescription>
            <CardTitle className="text-3xl text-blue-900">{globalStats.totalSubCategories}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-blue-700">
              <Layers className="mr-2 h-4 w-4" />
              {categories.length} parent categories
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-700 font-medium">Total Assets</CardDescription>
            <CardTitle className="text-3xl text-purple-900">{globalStats.totalAssets}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-purple-700">
              <Package className="mr-2 h-4 w-4" />
              Across all sub-categories
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-700 font-medium">Avg Availability</CardDescription>
            <CardTitle className="text-3xl text-green-900">{globalStats.avgAvailability}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-green-700">
              <TrendingUp className="mr-2 h-4 w-4" />
              {globalStats.totalOnline} online
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-red-700 font-medium">In Breakdown</CardDescription>
            <CardTitle className="text-3xl text-red-900">{globalStats.totalBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-red-700">
              <AlertCircle className="mr-2 h-4 w-4" />
              {globalStats.totalMaintenance} in maintenance
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sub-categories by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="assets">Asset Count</SelectItem>
                  <SelectItem value="availability">Availability</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span>Showing {filteredSubCategories.length} of {subCategories.length} types</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl border bg-card text-card-foreground shadow animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubCategories.map((sc) => (
            <Card key={sc._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{sc.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {sc.description || 'No description'}
                  </CardDescription>
                  {sc.category && (
                    <div className="mt-1">
                      <Badge variant="outline" className="font-normal">
                        {sc.category.name}
                      </Badge>
                    </div>
                  )}
                </div>
                {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(sc)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(sc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Total Assets
                    </p>
                    <p className="text-2xl font-bold">{sc.statistics?.totalAssets || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3" /> Availability
                    </p>
                    <div className="flex items-baseline gap-1">
                      <p className={`text-2xl font-bold ${(sc.statistics?.avgAvailability || 0) >= 95 ? 'text-green-600' :
                        (sc.statistics?.avgAvailability || 0) >= 85 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                        {sc.statistics?.avgAvailability ? `${Math.round(sc.statistics.avgAvailability)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mini Status Bar */}
                <div className="mt-6 space-y-2">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="bg-green-500" style={{ width: `${((sc.statistics?.statusBreakdown?.in_production || 0) / (sc.statistics?.totalAssets || 1)) * 100}%` }} title="Production" />
                    <div className="bg-amber-500" style={{ width: `${((sc.statistics?.statusBreakdown?.maintenance || 0) / (sc.statistics?.totalAssets || 1)) * 100}%` }} title="Maintenance" />
                    <div className="bg-red-500" style={{ width: `${((sc.statistics?.statusBreakdown?.breakdown || 0) / (sc.statistics?.totalAssets || 1)) * 100}%` }} title="Breakdown" />
                    <div className="bg-slate-400" style={{ width: `${((sc.statistics?.statusBreakdown?.offline || 0) / (sc.statistics?.totalAssets || 1)) * 100}%` }} title="Offline" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{(sc.statistics?.statusBreakdown?.in_production || 0)} Prod</span>
                    <span>{(sc.statistics?.statusBreakdown?.maintenance || 0)} Maint</span>
                    <span>{(sc.statistics?.statusBreakdown?.breakdown || 0)} Break</span>
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredSubCategories.length === 0 && !loading && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No sub-categories found</h3>
            <p className="text-slate-600 mb-4">
              {searchQuery
                ? `No sub-categories match "${searchQuery}". Try a different search term.`
                : categoryFilter === "all"
                  ? "Start by adding your first sub-category."
                  : "No sub-categories found for the selected category. Try selecting a different category or add a new sub-category."
              }
            </p>
            {(searchQuery || categoryFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setCategoryFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sub-Category</DialogTitle>
            <DialogDescription>Add a new sub-category for your assets.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Centrifugal Pumps"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-category">Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger id="create-category">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea
                id="create-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.categoryId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sub-Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sub-category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default SubCategories;
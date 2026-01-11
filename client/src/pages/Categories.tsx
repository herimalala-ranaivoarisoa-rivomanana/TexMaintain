import { useEffect, useState } from "react"
import { Plus, Search, Filter, Edit, Trash2, Tag, Activity, CheckCircle, AlertTriangle, Clock, Wrench } from 'lucide-react';
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
import {
  Category, // Renamed
  getCategoryStatistics, // Renamed
  createCategory, // Renamed
  updateCategory, // Renamed
  deleteCategory // Renamed
} from '@/api/categories';
import { getAssetClasses, AssetClass } from '@/api/assetClasses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<{ name: string; description: string; assetClass: string }>({ name: '', description: '', assetClass: '' });
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesData, assetClassesData] = await Promise.all([
        getCategoryStatistics(),
        getAssetClasses()
      ]);
      setCategories(categoriesData);
      setAssetClasses(assetClassesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch categories.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreate = async () => {
    try {
      if (!formData.assetClass) {
        toast({ title: 'Error', description: 'Asset Class is required', variant: 'destructive' });
        return;
      }
      await createCategory(formData);
      toast({
        title: 'Success',
        description: 'Category created successfully.',
      });
      setIsCreateOpen(false);
      setFormData({ name: '', description: '', assetClass: '' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create category.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!currentCategory) return;
    try {
      await updateCategory(currentCategory._id, formData);
      toast({
        title: 'Success',
        description: 'Category updated successfully.',
      });
      setIsEditOpen(false);
      setCurrentCategory(null);
      setFormData({ name: '', description: '', assetClass: '' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update category.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!currentCategory) return;
    try {
      await deleteCategory(currentCategory._id);
      toast({
        title: 'Success',
        description: 'Category deleted successfully.',
      });
      setIsDeleteOpen(false);
      setCurrentCategory(null);
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete category.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (category: Category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      assetClass: typeof category.assetClass === 'object' ? category.assetClass._id : category.assetClass
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (category: Category) => {
    setCurrentCategory(category);
    setIsDeleteOpen(true);
  };

  // Helper to render stats safely (even if 0)
  const renderStat = (value: number | undefined, suffix = '') => {
    return (value !== undefined ? value : 0) + suffix;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Categories</h1>
          <p className="text-muted-foreground">Manage asset categories and view statistics.</p>
        </div>
        <div className="flex items-center gap-2">

        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>Add a new category for your assets.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Conveyor Belts"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-class">Asset Class</Label>
                <Select
                  value={formData.assetClass}
                  onValueChange={(value) => setFormData({ ...formData, assetClass: value })}
                >
                  <SelectTrigger id="create-class">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetClasses.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>{cls.name}</SelectItem>
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
              <Button onClick={handleCreate} disabled={!formData.name || !formData.assetClass}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl border bg-card text-card-foreground shadow animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <Card key={category._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {category.description || 'No description'}
                  </CardDescription>
                  {category.assetClass && (
                    <div className="mt-1">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                        {typeof category.assetClass === 'object' ? category.assetClass.name : 'Unknown Class'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(category)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Total Assets
                    </p>
                    <p className="text-2xl font-bold">{renderStat(category.statistics?.totalAssets)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3" /> Availability
                    </p>
                    <div className="flex items-baseline gap-1">
                      <p className={`text-2xl font-bold ${(category.statistics?.avgAvailability || 0) >= 95 ? 'text-green-600' :
                        (category.statistics?.avgAvailability || 0) >= 85 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                        {renderStat(category.statistics?.avgAvailability, '%')}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> MTBF
                    </p>
                    <p className="text-lg font-semibold">{renderStat(category.statistics?.avgMtbf, 'h')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> MTTR
                    </p>
                    <p className="text-lg font-semibold">{renderStat(category.statistics?.avgMttr, 'h')}</p>
                  </div>
                </div>

                {/* Mini Status Bar */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Status Breakdown</span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                    {/* Production - Green */}
                    <div
                      className="bg-green-500"
                      style={{ width: `${((category.statistics?.statusBreakdown?.in_production || 0) / (category.statistics?.totalAssets || 1)) * 100}%` }}
                      title="Production"
                    />
                    {/* Maintenance - Orange */}
                    <div
                      className="bg-amber-500"
                      style={{ width: `${((category.statistics?.statusBreakdown?.maintenance || 0) / (category.statistics?.totalAssets || 1)) * 100}%` }}
                      title="Maintenance"
                    />
                    {/* Breakdown - Red */}
                    <div
                      className="bg-red-500"
                      style={{ width: `${((category.statistics?.statusBreakdown?.breakdown || 0) / (category.statistics?.totalAssets || 1)) * 100}%` }}
                      title="Breakdown"
                    />
                    {/* Offline - Gray */}
                    <div
                      className="bg-slate-400"
                      style={{ width: `${((category.statistics?.statusBreakdown?.offline || 0) / (category.statistics?.totalAssets || 1)) * 100}%` }}
                      title="Offline"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" />Prod</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" />Maint</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" />Break</span>
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog - Similar to Create */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {/* ... (Same form fields as create, simplified for brevity in this replace call, practically would duplicate) ... */}
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
              <Label htmlFor="edit-class">Asset Class</Label>
              <Select
                value={formData.assetClass}
                onValueChange={(value) => setFormData({ ...formData, assetClass: value })}
              >
                <SelectTrigger id="edit-class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {assetClasses.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
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

export default Categories;
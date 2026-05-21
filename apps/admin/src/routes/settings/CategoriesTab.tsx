// apps/admin/src/routes/settings/CategoriesTab.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Category } from '../../lib/api/categories'
import {
  Button, Input, Badge, Switch,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
  Skeleton,
  useToast,
} from '@glee/ui'
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
} from '../../lib/queries/categories'
import { Pencil, Plus, Trash2 } from 'lucide-react'

const categorySchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isActive:    z.boolean(),
})
type CategoryFormValues = z.infer<typeof categorySchema>

function CategoryFormDialog({
  mode,
  initial,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  mode: 'create' | 'edit'
  initial?: Category
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CategoryFormValues) => Promise<void>
  isPending: boolean
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name:        initial?.name ?? '',
      description: initial?.description ?? '',
      isActive:    initial?.isActive ?? true,
    },
  })

  async function handleSubmit(values: CategoryFormValues) {
    await onSubmit(values)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Category' : 'Edit Category'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Afrobeats" className="bg-admin-input border-admin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-admin-30">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Short description…" className="bg-admin-input border-admin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-neon-pink"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-neon-pink hover:bg-neon-pink/90 text-white"
              >
                {isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default function CategoriesTab() {
  const { toast } = useToast()
  const [createOpen, setCreateOpen]             = useState(false)
  const [editTarget, setEditTarget]             = useState<Category | null>(null)

  const { data: categories, isLoading }         = useCategories()
  const createMutation                          = useCreateCategory()
  const updateMutation                          = useUpdateCategory()
  const deleteMutation                          = useDeleteCategory()

  async function handleCreate(values: CategoryFormValues) {
    try {
      await createMutation.mutateAsync(values)
      toast({ title: 'Category created' })
    } catch {
      toast({ title: 'Failed to create category', variant: 'destructive' })
    }
  }

  async function handleUpdate(values: CategoryFormValues) {
    if (!editTarget) return
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, dto: values })
      toast({ title: 'Category updated' })
      setEditTarget(null)
    } catch {
      toast({ title: 'Failed to update category', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast({ title: 'Category deleted' })
    } catch {
      toast({ title: 'Failed to delete category', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-base text-foreground">Event Categories</h2>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-neon-pink hover:bg-neon-pink/90 text-white gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      <div className="bg-admin-surface border border-admin rounded-2xl overflow-hidden shadow-admin">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : (
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-admin">
                  {['Name', 'Description', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs text-admin-30 font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(categories ?? []).map(cat => (
                  <tr key={cat.id} className="border-b border-admin hover:bg-admin-overlay transition-colors">
                    <td className="px-5 py-3 text-sm text-admin-80 font-medium">{cat.name}</td>
                    <td className="px-5 py-3 text-xs text-admin-50 max-w-[200px] truncate">{cat.description || '—'}</td>
                    <td className="px-5 py-3">
                      <Badge className={`text-[10px] border ${
                        cat.isActive
                          ? 'bg-green-500/10 text-green-500 border-green-500/30'
                          : 'bg-admin-overlay text-admin-40 border-admin'
                      }`}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-admin-40 whitespace-nowrap">
                      {new Date(cat.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditTarget(cat)}
                          className="h-7 w-7 p-0 text-admin-40 hover:text-admin-80"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500/50 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{cat.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Events using this category will be unaffected, but the category cannot be restored.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(cat.id)}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {(categories ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-admin-30">
                      No categories yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <CategoryFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
      />

      {/* Edit dialog */}
      {editTarget && (
        <CategoryFormDialog
          mode="edit"
          initial={editTarget}
          open={editTarget !== null}
          onOpenChange={open => { if (!open) setEditTarget(null) }}
          onSubmit={handleUpdate}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}

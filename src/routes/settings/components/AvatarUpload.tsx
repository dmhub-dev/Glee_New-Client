import { useRef } from 'react'
import { Camera, ImageUp } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback, Button, useToast } from '@glee/ui'
import { useUploadAvatar, type ProfileData } from '@glee/api'

interface AvatarUploadProps {
  profileData: ProfileData
}

export function AvatarUpload({ profileData }: AvatarUploadProps) {
  const { toast } = useToast()
  const avatarMutation = useUploadAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fallback =
    profileData.firstName?.charAt(0).toUpperCase() ??
    profileData.email?.charAt(0).toUpperCase() ??
    '?'

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be under 5 MB', variant: 'destructive' })
      e.target.value = ''
      return
    }
    try {
      await avatarMutation.mutateAsync(file)
      toast({ title: 'Avatar updated' })
    } catch {
      toast({ title: 'Failed to upload avatar', variant: 'destructive' })
    }
    e.target.value = ''
  }

  return (
    <div className="inline-flex max-w-full items-center gap-4 rounded-xl border border-admin bg-admin-overlay px-4 py-3">
      <div className="relative group shrink-0">
        <Avatar className="h-20 w-20 border border-admin shadow-admin">
          {profileData.avatarUrl ? (
            <AvatarImage src={profileData.avatarUrl} alt={profileData.firstName} />
          ) : null}
          <AvatarFallback className="bg-neon-pink/10 text-neon-pink text-2xl font-black">
            {fallback}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          aria-label="Upload avatar"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarMutation.isPending}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
        >
          <Camera className="h-5 w-5 text-white" />
        </button>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-admin-90">Profile image</p>
        <p className="mt-0.5 text-xs text-admin-40">JPG, PNG or WebP under 5 MB.</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarMutation.isPending}
          className="mt-3 h-8 gap-2 border-admin"
        >
          <ImageUp className="h-3.5 w-3.5" />
          {avatarMutation.isPending ? 'Uploading...' : 'Update image'}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />
    </div>
  )
}

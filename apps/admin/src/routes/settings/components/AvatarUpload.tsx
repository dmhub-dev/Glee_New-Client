// apps/admin/src/routes/settings/components/AvatarUpload.tsx
import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback, useToast } from '@glee/ui'
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
    <div className="relative group">
      <Avatar className="h-16 w-16">
        {profileData.avatarUrl ? (
          <AvatarImage src={profileData.avatarUrl} alt={profileData.firstName} />
        ) : null}
        <AvatarFallback className="bg-admin-overlay text-admin-80 text-lg font-semibold">
          {fallback}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        aria-label="Upload avatar"
        onClick={() => fileInputRef.current?.click()}
        disabled={avatarMutation.isPending}
        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
      >
        <Camera className="h-5 w-5 text-white" />
      </button>
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

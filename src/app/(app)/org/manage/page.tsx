'use client'

import { AddCafeteriaDialog } from '@/components/org/add-cafeteria-dialog'
import { CafeteriasList } from '@/components/org/cafeterias-list'
import { InviteDialog } from '@/components/org/invite-dialog'
import { MembersList } from '@/components/org/members-list'
import { OrgGuard } from '@/components/org/org-guard'
import { PageHeader } from '@/components/shell/page-header'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { roleLabel } from '@/lib/roles'

export default function ManagePage() {
  return (
    <OrgGuard>
      {({ organization, canManage }) => (
        <div className="flex flex-col gap-4">
          <PageHeader
            title="Manage"
            description={organization.displayName}
            action={<Badge variant="secondary">{roleLabel(organization.role)}</Badge>}
          />
          <Tabs defaultValue="team">
            <TabsList className="w-full">
              <TabsTrigger value="team" className="flex-1">
                Team
              </TabsTrigger>
              <TabsTrigger value="cafeterias" className="flex-1">
                Cafeterias
              </TabsTrigger>
            </TabsList>
            <TabsContent value="team" className="flex flex-col gap-4 pt-4">
              {canManage ? (
                <div className="flex justify-end">
                  <InviteDialog organizationId={organization.id} />
                </div>
              ) : null}
              <MembersList organizationId={organization.id} />
            </TabsContent>
            <TabsContent value="cafeterias" className="flex flex-col gap-4 pt-4">
              {canManage ? (
                <div className="flex justify-end">
                  <AddCafeteriaDialog organizationId={organization.id} />
                </div>
              ) : null}
              <CafeteriasList organizationId={organization.id} />
            </TabsContent>
          </Tabs>
          {!canManage ? (
            <p className="text-xs text-muted-foreground">Only owners and admins can invite people or add cafeterias.</p>
          ) : null}
        </div>
      )}
    </OrgGuard>
  )
}

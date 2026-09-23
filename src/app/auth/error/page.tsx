import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Page({ searchParams }: PageProps<'/auth/error'>) {
  const params = await searchParams
  const code = typeof params?.error === 'string' ? params.error : null

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
          </CardHeader>
          <CardContent>
            {code ? (
              <p className="text-sm text-muted-foreground">Code error: {code}</p>
            ) : (
              <p className="text-sm text-muted-foreground">We could not complete the sign-in. Please try again.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button render={<Link href="/auth/login" />} nativeButton={false} variant="outline">
              Back to sign in
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

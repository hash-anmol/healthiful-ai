import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">User Name</h3>
              <p className="text-muted-foreground">user@example.com</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Button variant="outline" className="w-full justify-start text-lg h-14 gap-3">
          <Settings className="w-5 h-5" />
          App Settings
        </Button>
        <Button variant="destructive" className="w-full justify-start text-lg h-14 gap-3">
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

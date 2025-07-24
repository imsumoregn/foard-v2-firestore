import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InspirationCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Daily Inspiration</CardTitle>
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <blockquote className="border-l-2 pl-4 italic">
          "The secret of getting ahead is getting started."
        </blockquote>
        <p className="mt-2 text-right text-sm text-muted-foreground">- Mark Twain</p>
      </CardContent>
    </Card>
  );
}

import { redirect } from 'next/navigation';

export default function GCodePage() {
  redirect('/settings?tab=macros');
}

import { toast } from 'sonner';
import type { ActionResult } from '@/app/proveedores/actions';

export function handleActionResult(result: ActionResult, successMessage: string): boolean {
  if (!result.success) {
    toast.error(result.error);
    return false;
  }
  toast.success(successMessage);
  return true;
}

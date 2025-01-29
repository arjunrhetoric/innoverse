import { cn } from "@/utlis/cn";
export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn("rounded-lg bg-white shadow-sm", className)}>{children}</div>
  );
  
  export const CardHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="p-4">{children}</div> // Removed border
  );
  
  export const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={cn("text-lg font-semibold leading-none", className)}>{children}</h3>
  );
  
  export const CardDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={cn("text-sm text-gray-500", className)}>{children}</p>
  );
  
  export const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("p-4", className)}>{children}</div> // Removed border
  );
  
  export const CardFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("p-4", className)}>{children}</div> // Removed border
  );
  
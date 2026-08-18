import { Check } from "lucide-react"

interface StepIndicatorProps {
  currentStep: number
  steps: string[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex flex-col w-full mb-8">
      <div className="flex items-center w-full">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isActive = stepNumber === currentStep

          return (
            <div key={step} className={`flex items-center ${index < steps.length - 1 ? "flex-1" : "flex-none"}`}>
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 z-10 transition-colors
                    ${isCompleted ? "bg-brand-400 border-brand-400 text-white" : 
                      isActive ? "bg-surface-800 border-brand-400 text-brand-400" : 
                      "bg-surface-800 border-surface-500 text-surface-500"}`}
                >
                  {isCompleted ? <Check size={16} /> : stepNumber}
                </div>
                <span className={`absolute top-10 text-xs whitespace-nowrap font-medium ${isActive || isCompleted ? "text-white" : "text-surface-500"}`}>
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-surface-600 relative overflow-hidden">
                   {isCompleted && <div className="absolute inset-0 bg-brand-400 w-full"></div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

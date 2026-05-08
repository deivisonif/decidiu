import { Check } from 'lucide-react';

interface Step {
  number: number;
  name: string;
}

interface FormStepperProps {
  steps: Step[];
  currentStep: number;
}

export default function FormStepper({ steps, currentStep }: FormStepperProps) {
  return (
    <div className="w-full py-6 px-4 bg-white rounded-lg shadow-sm mb-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg transition-all ${
                  step.number < currentStep
                    ? 'bg-[#2d7a4f] text-white'
                    : step.number === currentStep
                    ? 'bg-[#2d7a4f] text-white ring-4 ring-[#2d7a4f]/30'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.number < currentStep ? (
                  <Check size={24} />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`mt-2 text-sm font-medium text-center ${
                  step.number === currentStep
                    ? 'text-[#2d7a4f]'
                    : step.number < currentStep
                    ? 'text-gray-700'
                    : 'text-gray-400'
                }`}
              >
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-1 mx-4 -mt-8">
                <div
                  className={`h-full rounded transition-all ${
                    step.number < currentStep
                      ? 'bg-[#2d7a4f]'
                      : 'bg-gray-200'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

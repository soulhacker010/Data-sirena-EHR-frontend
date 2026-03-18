/**
 * StripePaymentForm — Embeddable Stripe card form.
 *
 * Flow:
 * 1. Parent calls billingApi.createStripePayment() to get client_secret
 * 2. This component renders the Stripe Elements card form
 * 3. User fills in card → clicks Pay → confirmCardPayment()
 * 4. On success, immediately calls billingApi.confirmStripePayment()
 *    to record the payment in the DB (no webhook needed)
 */
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js'
import type { PaymentIntent, StripeError } from '@stripe/stripe-js'
import { CreditCard, ShieldCheck, Lock } from '@phosphor-icons/react'
import { billingApi } from '../../api/billing'

// Initialize Stripe with the publishable key from env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

interface StripePaymentFormProps {
    clientSecret: string
    amount: number
    invoiceNumber: string
    onSuccess: () => void
    onCancel: () => void
}

// Card element styling to match our design system
const cardElementOptions = {
    style: {
        base: {
            fontSize: '16px',
            fontFamily: '"Inter", -apple-system, sans-serif',
            color: '#1e293b',
            '::placeholder': { color: '#94a3b8' },
            iconColor: '#6366f1',
        },
        invalid: {
            color: '#ef4444',
            iconColor: '#ef4444',
        },
    },
    hidePostalCode: false,
}

/**
 * Inner form component — must be inside <Elements> provider.
 */
function CheckoutForm({ clientSecret, amount, invoiceNumber, onSuccess, onCancel }: StripePaymentFormProps) {
    const stripe = useStripe()
    const elements = useElements()
    const [isProcessing, setIsProcessing] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const finalizeSuccessfulPayment = async (paymentIntentId: string) => {
        try {
            await billingApi.confirmStripePayment(paymentIntentId)
        } catch {
            // no-op: webhook remains fallback
        }
        onSuccess()
    }

    const handlePaymentError = async (error: StripeError) => {
        const succeededPaymentIntent = error.code === 'payment_intent_unexpected_state'
            ? error.payment_intent
            : undefined

        if (succeededPaymentIntent?.status === 'succeeded') {
            await finalizeSuccessfulPayment(succeededPaymentIntent.id)
            return
        }

        setErrorMessage(error.message || 'Payment failed. Please try again.')
        setIsProcessing(false)
    }

    const handlePaymentSuccess = async (paymentIntent: PaymentIntent) => {
        if (paymentIntent.status === 'succeeded') {
            await finalizeSuccessfulPayment(paymentIntent.id)
            return
        }

        setErrorMessage('Payment was not completed. Please try again.')
        setIsProcessing(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!stripe || !elements) return

        setIsProcessing(true)
        setErrorMessage(null)

        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
            setErrorMessage('Card form not loaded. Please refresh and try again.')
            setIsProcessing(false)
            return
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: { card: cardElement },
        })

        if (error) {
            await handlePaymentError(error)
            return
        }

        if (paymentIntent) {
            await handlePaymentSuccess(paymentIntent)
            return
        }

        setErrorMessage('Payment was not completed. Please try again.')
        setIsProcessing(false)
    }

    return (
        <form onSubmit={handleSubmit} className="stripe-payment-form">
            {/* Practice branding header */}
            <div className="stripe-brand-header">
                <div className="stripe-brand-icon">
                    <img src="/images/EHRlogo.png" alt="Sirena Health EHR" className="stripe-brand-logo" />
                </div>
                <div className="stripe-brand-info">
                    <span className="stripe-brand-name">Sirena Health EHR</span>
                    <span className="stripe-brand-sub">Secure payment portal</span>
                </div>
                <div className="stripe-amount-badge">
                    ${amount.toFixed(2)}
                </div>
            </div>

            <div className="stripe-form-inner">
                <div className="stripe-form-header">
                    <CreditCard size={20} weight="duotone" />
                    <div>
                        <h4>Card Details</h4>
                        <p>Invoice {invoiceNumber}</p>
                    </div>
                </div>

                <div className="stripe-card-element-wrapper">
                    <CardElement options={cardElementOptions} />
                </div>

                {errorMessage && (
                    <div className="stripe-error-message">
                        {errorMessage}
                    </div>
                )}

                <div className="stripe-security-note">
                    <Lock size={12} weight="fill" />
                    <span>256-bit SSL encryption · Secured by Stripe · Card details never touch our servers</span>
                </div>

                <div className="stripe-form-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onCancel}
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary stripe-pay-btn"
                        disabled={!stripe || isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <span className="spinner-sm" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={18} weight="bold" />
                                Pay ${amount.toFixed(2)} Securely
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    )
}

/**
 * Wrapped component with Elements provider.
 * Use this in your page — just pass clientSecret + amount.
 */
export default function StripePaymentForm(props: StripePaymentFormProps) {
    return (
        <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret }}>
            <CheckoutForm {...props} />
        </Elements>
    )
}

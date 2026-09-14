import { useEffect, useState } from 'react'
import { createProduct, updateProduct } from '../../api/products'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Alert from '../../components/ui/Alert'
import { useToast } from '../../contexts/useToast'
import { toNumber } from '../../lib/format'

const EMPTY = {
  name: '',
  description: '',
  price: '',
  category: '',
  stockQuantity: '',
  imageUrl: '',
}

/* Mirrors ProductRequestDTO validation so the first failure comes from the
   same rules the product service enforces. */
function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Product name is required.'
  else if (form.name.trim().length > 255) errors.name = 'Name must be 255 characters or fewer.'

  if (form.price === '' || toNumber(form.price) <= 0) errors.price = 'Enter a price greater than 0.'

  if (form.category.trim().length > 100) errors.category = 'Category must be 100 characters or fewer.'

  if (form.stockQuantity !== '' && toNumber(form.stockQuantity) < 0)
    errors.stockQuantity = 'Stock cannot be negative.'

  if (form.imageUrl.trim() && !/^https?:\/\/\S+$/i.test(form.imageUrl.trim()))
    errors.imageUrl = 'Enter a full image URL starting with http:// or https://.'

  return errors
}

/**
 * ProductFormDialog — create or edit one product.
 *
 * `product` present means edit. Field-level errors returned by the service's
 * validation handler (a bare `{ field: message }` map) are mapped onto the
 * matching inputs.
 */
function ProductFormDialog({ open, product, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const isEditing = Boolean(product?.id)

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    setFormError(null)
    setForm(
      product
        ? {
            name: product.name || '',
            description: product.description || '',
            price: product.price !== undefined && product.price !== null ? String(product.price) : '',
            category: product.category || '',
            stockQuantity:
              product.stockQuantity !== undefined && product.stockQuantity !== null
                ? String(product.stockQuantity)
                : '',
            imageUrl: product.imageUrl || '',
          }
        : EMPTY,
    )
  }, [open, product])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSaving) return

    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: toNumber(form.price),
      category: form.category.trim() || undefined,
      stockQuantity: form.stockQuantity === '' ? undefined : Math.trunc(toNumber(form.stockQuantity)),
      imageUrl: form.imageUrl.trim() || undefined,
    }

    setIsSaving(true)
    setFormError(null)
    try {
      const saved = isEditing
        ? await updateProduct(product.id, payload)
        : await createProduct(payload)

      toast.success(
        isEditing ? 'Product updated' : 'Product created',
        `${saved?.name || payload.name} is now in the catalog.`,
      )
      onSaved?.(saved)
      onClose?.()
    } catch (error) {
      if (error?.fieldErrors) setFieldErrors(error.fieldErrors)
      else setFormError(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={isEditing ? 'Edit product' : 'New product'}
      description="Written straight to the product service. Only administrators can do this."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" isLoading={isSaving} loadingLabel="Saving…">
            {isEditing ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      {formError && (
        <Alert tone="danger" className="mb-5" title="The product was not saved">
          {formError.message}
        </Alert>
      )}

      <form id="product-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Name"
          name="name"
          required
          maxLength={255}
          value={form.name}
          error={fieldErrors.name}
          onChange={handleChange}
          data-autofocus
        />

        <Textarea
          label="Description"
          name="description"
          rows={3}
          value={form.description}
          error={fieldErrors.description}
          onChange={handleChange}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Price"
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            required
            value={form.price}
            error={fieldErrors.price}
            onChange={handleChange}
          />
          <Input
            label="Category"
            name="category"
            maxLength={100}
            value={form.category}
            error={fieldErrors.category}
            hint={fieldErrors.category ? undefined : 'Groups the product in the catalog.'}
            onChange={handleChange}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Catalog stock quantity"
            name="stockQuantity"
            type="number"
            min="0"
            step="1"
            value={form.stockQuantity}
            error={fieldErrors.stockQuantity}
            hint={
              fieldErrors.stockQuantity
                ? undefined
                : 'The catalog figure. Reservation happens in the inventory service.'
            }
            onChange={handleChange}
          />
          <Input
            label="Image URL"
            name="imageUrl"
            type="url"
            placeholder="https://…"
            value={form.imageUrl}
            error={fieldErrors.imageUrl}
            onChange={handleChange}
          />
        </div>

        {form.imageUrl.trim() && !fieldErrors.imageUrl && (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas p-3">
            <img
              src={form.imageUrl}
              alt="Product image preview"
              className="size-14 rounded-md border border-line object-cover"
              onError={(event) => {
                event.currentTarget.style.visibility = 'hidden'
              }}
            />
            <p className="text-xs text-ink-muted">
              Preview. Broken URLs fall back to a monogram tile in the storefront.
            </p>
          </div>
        )}
      </form>
    </Dialog>
  )
}

export default ProductFormDialog

"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const countries = [
  "Argentina", "Bolivia", "Brasil", "Chile", "Colombia", "Costa Rica", "Cuba",
  "Ecuador", "El Salvador", "Guatemala", "Honduras", "México", "Nicaragua",
  "Panamá", "Paraguay", "Perú", "República Dominicana", "Uruguay", "Venezuela",
]

const formSchema = z.object({
  email: z.string().email({ message: "Correo electrónico no válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  name: z.string().optional(),
  age: z.string().optional(),
  country: z.string().optional(),
})

const registerSchema = formSchema.extend({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  age: z.string().min(1, { message: "La edad es obligatoria." }),
  country: z.string().min(1, { message: "El país es obligatorio." }),
})

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const { toast } = useToast()

  const currentSchema = isLogin ? formSchema : registerSchema;

  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      age: "",
      country: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof currentSchema>) => {
    setLoading(true)
    try {
      if (isLogin) {
        await login(values.email, values.password)
        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión correctamente",
        })
      } else {
        const registerValues = values as z.infer<typeof registerSchema>
        await register(
          registerValues.email,
          registerValues.password,
          registerValues.name,
          Number.parseInt(registerValues.age),
          registerValues.country,
        )
        toast({
          title: "¡Cuenta creada!",
          description: "Tu cuenta ha sido creada exitosamente",
        })
      }
    } catch (error: any) {
      console.error("Auth error:", error)
      let errorMessage = "Ha ocurrido un error inesperado"
     
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
          {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
        </h3>
        <p className="text-gray-600 text-sm lg:text-base">
          {isLogin ? "Ingresa tus credenciales para acceder" : "Completa tus datos para comenzar"}
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
          {!isLogin && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={loading} className="rounded-2xl border-2 border-gray-200 focus:border-[#286675] transition-colors h-11 lg:h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={loading} className="rounded-2xl border-2 border-gray-200 focus:border-[#286675] transition-colors h-11 lg:h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger className="rounded-2xl border-2 border-gray-200 focus:border-[#286675] h-11 lg:h-12">
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input type="email" {...field} disabled={loading} className="rounded-2xl border-2 border-gray-200 focus:border-[#286675] transition-colors h-11 lg:h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" {...field} disabled={loading} className="rounded-2xl border-2 border-gray-200 focus:border-[#286675] transition-colors h-11 lg:h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full h-11 lg:h-12 bg-[#253239] hover:bg-[#1a2327] text-white font-semibold rounded-2xl" disabled={loading}>
            {loading ? "Procesando..." : isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin)
            form.reset()
          }}
          className="text-sm text-[#6b8f7a] hover:text-[#55705f] hover:underline"
          disabled={loading}
        >
          {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  )
}

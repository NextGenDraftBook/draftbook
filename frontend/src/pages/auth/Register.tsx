import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Phone, Building, Loader2, AlertTriangle, MapPin, Globe, Clock, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
  // Campos condicionales según el tipo de registro
  nombreNegocio: z.string().optional(),
  negocioId: z.string().optional(), // Para clientes que se registran en un negocio existente
  // Nuevos campos para negocio
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  codigoPostal: z.string().optional(),
  descripcion: z.string().optional(),
  especialidad: z.string().optional(),
  horarioAtencion: z.string().optional(),
  sitioWeb: z.string().url('Debe ser una URL válida').optional().or(z.literal(''))
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

type RegistroTipo = 'negocio' | 'cliente';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showAccessForm, setShowAccessForm] = useState(true);
  const [tipoRegistro, setTipoRegistro] = useState<RegistroTipo>('negocio');
  const [negociosDisponibles, setNegociosDisponibles] = useState<any[]>([]);

  // Inicializar hooks ANTES del conditional rendering
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Códigos de acceso (en producción esto debería estar en variables de entorno)
  const BUSINESS_ACCESS_CODE = "NEGOCIO2024";
  const CLIENT_ACCESS_CODE = "CLIENTE2024";

  const checkAccessCode = async () => {
    let isValid = false;
    let message = '';

    if (tipoRegistro === 'negocio' && accessCode === BUSINESS_ACCESS_CODE) {
      isValid = true;
      message = 'Código válido. Puedes registrar tu consultorio/negocio.';
    } else if (tipoRegistro === 'cliente' && accessCode === CLIENT_ACCESS_CODE) {
      isValid = true;
      message = 'Código válido. Puedes registrarte como cliente.';
      
      // Cargar negocios disponibles para que el cliente elija
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${API_BASE_URL}/public/negocios`);
        if (response.ok) {
          const data = await response.json();
          setNegociosDisponibles(data.negocios || []);
        }
      } catch (error) {
        console.error('Error al cargar negocios:', error);
      }
    } else {
      message = `Código de acceso inválido para registro de ${tipoRegistro}. Contacta al administrador para obtener el código correcto.`;
    }

    if (isValid) {
      setIsAuthorized(true);
      setShowAccessForm(false);
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      let endpoint = '';
      let requestBody = {};

      if (tipoRegistro === 'negocio') {
        // Registro de negocio/consultorio
        endpoint = `${API_BASE_URL}/auth/registro`;
        requestBody = {
          ...data,
          nombreNegocio: data.nombreNegocio,
        };
      } else {
        // Registro de cliente en un negocio existente
        endpoint = `${API_BASE_URL}/auth/register-cliente`;
        requestBody = {
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email,
          telefono: data.telefono,
          password: data.password,
          negocioId: data.negocioId,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al registrar');
      }

      const successMessage = tipoRegistro === 'negocio' 
        ? 'Consultorio registrado exitosamente. Por favor inicia sesión.'
        : 'Registro como cliente exitoso. Por favor inicia sesión.';
      
      toast.success(successMessage);
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar');
    } finally {
      setIsLoading(false);
    }
  };

  // Si no está autorizado, mostrar formulario de código de acceso
  if (showAccessForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Acceso Restringido
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Selecciona el tipo de registro e ingresa el código de acceso correspondiente.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {/* Selector de tipo de registro */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Registro
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTipoRegistro('negocio')}
                  className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    tipoRegistro === 'negocio'
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  )}
                >
                  <Building className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Consultorio/Negocio</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Registro de consultorio médico
                  </div>
                </button>
                
                <button
                  onClick={() => setTipoRegistro('cliente')}
                  className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    tipoRegistro === 'cliente'
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  )}
                >
                  <User className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Cliente/Paciente</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Registro como paciente
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="access-code" className="block text-sm font-medium text-gray-700">
                Código de Acceso {tipoRegistro === 'negocio' ? 'para Consultorios' : 'para Clientes'}
              </label>
              <div className="mt-1">
                <input
                  id="access-code"
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkAccessCode()}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={`Código para ${tipoRegistro === 'negocio' ? 'consultorios' : 'clientes'}`}
                />
              </div>
            </div>

            <div>
              <button
                onClick={checkAccessCode}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Verificar Código
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                ¿Ya tienes una cuenta?{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>¿Necesitas acceso?</strong><br />
                {tipoRegistro === 'negocio' 
                  ? 'Contacta al administrador para obtener el código de acceso para registrar tu consultorio.'
                  : 'Solicita el código de acceso a tu consultorio médico para registrarte como paciente.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {tipoRegistro === 'negocio' ? 'Registrar Consultorio' : 'Registrar Cliente'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {tipoRegistro === 'negocio' 
              ? 'Registra tu consultorio médico en draftbook' 
              : 'Únete como paciente a un consultorio existente'
            }
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Información Personal */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('nombre')}
                      type="text"
                      id="nombre"
                      className={cn(
                        'appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                        errors.nombre && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      )}
                      placeholder="Juan"
                    />
                  </div>
                  {errors.nombre && (
                    <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">
                    Apellido
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('apellido')}
                      type="text"
                      id="apellido"
                      className={cn(
                        'appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                        errors.apellido && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      )}
                      placeholder="Pérez"
                    />
                  </div>
                  {errors.apellido && (
                    <p className="mt-1 text-sm text-red-600">{errors.apellido.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    className={cn(
                      'appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                      errors.email && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    )}
                    placeholder="tu@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="mt-4">
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('telefono')}
                    type="tel"
                    id="telefono"
                    className={cn(
                      'appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                      errors.telefono && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    )}
                    placeholder="+52 55 1234 5678"
                  />
                </div>
                {errors.telefono && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p>
                )}
              </div>
            </div>            {/* Información del Negocio - Solo para consultorios */}
            {tipoRegistro === 'negocio' && (
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Consultorio</h3>
                
                <div className="mt-4">
                  <label htmlFor="nombreNegocio" className="block text-sm font-medium text-gray-700">
                    Nombre del Consultorio
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('nombreNegocio', { 
                        required: tipoRegistro === 'negocio' ? 'El nombre del consultorio es requerido' : false 
                      })}
                      type="text"
                      id="nombreNegocio"
                      className={cn(
                        'appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                        errors.nombreNegocio && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      )}
                      placeholder="Consultorio Médico Dr. Pérez"
                    />
                  </div>
                  {errors.nombreNegocio && (
                    <p className="mt-1 text-sm text-red-600">{errors.nombreNegocio.message}</p>
                  )}
                </div>

                {/* Dirección del consultorio */}
                <div className="mt-4">
                  <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">
                    Dirección del Consultorio
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('direccion')}
                      type="text"
                      id="direccion"
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Calle Principal #123, Colonia Centro"
                    />
                  </div>
                </div>

                {/* Ciudad, Estado y Código Postal */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700">
                      Ciudad
                    </label>
                    <div className="mt-1">
                      <input
                        {...register('ciudad')}
                        type="text"
                        id="ciudad"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Ciudad de México"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                      Estado
                    </label>
                    <div className="mt-1">
                      <input
                        {...register('estado')}
                        type="text"
                        id="estado"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="CDMX"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="codigoPostal" className="block text-sm font-medium text-gray-700">
                      Código Postal
                    </label>
                    <div className="mt-1">
                      <input
                        {...register('codigoPostal')}
                        type="text"
                        id="codigoPostal"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="01000"
                      />
                    </div>
                  </div>
                </div>

                {/* Especialidad */}
                <div className="mt-4">
                  <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700">
                    Especialidad Médica
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('especialidad')}
                      type="text"
                      id="especialidad"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Medicina General, Cardiología, Pediatría, etc."
                    />
                  </div>
                </div>

                {/* Horario de atención */}
                <div className="mt-4">
                  <label htmlFor="horarioAtencion" className="block text-sm font-medium text-gray-700">
                    Horario de Atención
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      {...register('horarioAtencion')}
                      id="horarioAtencion"
                      rows={3}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Lunes a Viernes: 9:00 - 18:00&#10;Sábados: 9:00 - 14:00&#10;Domingos: Cerrado"
                    />
                  </div>
                </div>

                {/* Sitio web */}
                <div className="mt-4">
                  <label htmlFor="sitioWeb" className="block text-sm font-medium text-gray-700">
                    Sitio Web (Opcional)
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('sitioWeb')}
                      type="url"
                      id="sitioWeb"
                      className={cn(
                        'appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                        errors.sitioWeb && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      )}
                      placeholder="https://www.miconsultorio.com"
                    />
                  </div>
                  {errors.sitioWeb && (
                    <p className="mt-1 text-sm text-red-600">{errors.sitioWeb.message}</p>
                  )}
                </div>

                {/* Descripción */}
                <div className="mt-4">
                  <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
                    Descripción del Consultorio (Opcional)
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      {...register('descripcion')}
                      id="descripcion"
                      rows={4}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Breve descripción de los servicios que ofrece el consultorio..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Selección de Consultorio - Solo para clientes */}
            {tipoRegistro === 'cliente' && (
              <div className="bg-green-50 p-4 rounded-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Seleccionar Consultorio</h3>
                
                <div className="mt-4">
                  <label htmlFor="negocioId" className="block text-sm font-medium text-gray-700">
                    Consultorio Médico
                  </label>
                  <div className="mt-1">
                    <select
                      {...register('negocioId', { 
                        required: tipoRegistro === 'cliente' ? 'Debes seleccionar un consultorio' : false 
                      })}
                      id="negocioId"
                      className={cn(
                        'appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                        errors.negocioId && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      )}
                    >
                      <option value="">Selecciona tu consultorio médico</option>
                      {negociosDisponibles.map((negocio) => (
                        <option key={negocio.id} value={negocio.id}>
                          {negocio.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.negocioId && (
                    <p className="mt-1 text-sm text-red-600">{errors.negocioId.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Selecciona el consultorio donde eres paciente. Si no encuentras tu consultorio, contacta al personal médico.
                  </p>
                </div>
              </div>
            )}

            {/* Contraseñas */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Seguridad</h3>
              
              <div className="mt-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className={cn(
                      'appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                      errors.password && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="mt-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar Contraseña
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className={cn(
                      'appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                      errors.confirmPassword && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                tipoRegistro === 'negocio' ? 'Registrar Consultorio' : 'Registrar Cliente'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register; 
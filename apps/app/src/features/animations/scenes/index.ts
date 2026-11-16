import type { Scene } from '../engine';
import acuerdoFamiliarDePantallas from './acuerdo-familiar-de-pantallas';
import avioncitoEnCasa from './avioncito-en-casa';
import bibliotecaDelBarrio from './biblioteca-del-barrio';
import busquedaDelTesoroEnLaPlaza from './busqueda-del-tesoro-en-la-plaza';
import cajaDeCalma from './caja-de-calma';
import caminataOBiciConCharla from './caminata-o-bici-con-charla';
import canastaDeTesoros from './canasta-de-tesoros';
import circuitoEnElLiving from './circuito-en-el-living';
import cocinaSinFuego from './cocina-sin-fuego';
import contarLoCotidiano from './contar-lo-cotidiano';
import dadoYTurnos from './dado-y-turnos';
import desafioDeEquilibrio from './desafio-de-equilibrio';
import dibujoACiegas from './dibujo-a-ciegas';
import disfracesConLoQueHay from './disfraces-con-lo-que-hay';
import estacionDePiso from './estacion-de-piso';
import finalConAviso from './final-con-aviso';
import flotaOSeHunde from './flota-o-se-hunde';
import huertaEnMacetas from './huerta-en-macetas';
import juegosDePatioDeSiempre from './juegos-de-patio-de-siempre';
import leerConPreguntas from './leer-con-preguntas';
import mesaSinPantallas from './mesa-sin-pantallas';
import musicaYMovimiento from './musica-y-movimiento';
import naipesYMemotest from './naipes-y-memotest';
import panzaAlPisoConEspejo from './panza-al-piso-con-espejo';
import preguntasDeLaSemana from './preguntas-de-la-semana';
import respirarSoplandoVelitas from './respirar-soplando-velitas';
import rutinaParaDormir from './rutina-para-dormir';
import semaforoDeLaCalma from './semaforo-de-la-calma';
import teatroDeSombras from './teatro-de-sombras';
import videoFamiliar from './video-familiar';

/** Escena de cada actividad, por su slug (las actividades nuevas usan la genérica de su categoría). */
export const SCENES: Record<string, Scene> = {
  'acuerdo-familiar-de-pantallas': acuerdoFamiliarDePantallas,
  'avioncito-en-casa': avioncitoEnCasa,
  'biblioteca-del-barrio': bibliotecaDelBarrio,
  'busqueda-del-tesoro-en-la-plaza': busquedaDelTesoroEnLaPlaza,
  'caja-de-calma': cajaDeCalma,
  'caminata-o-bici-con-charla': caminataOBiciConCharla,
  'canasta-de-tesoros': canastaDeTesoros,
  'circuito-en-el-living': circuitoEnElLiving,
  'cocina-sin-fuego': cocinaSinFuego,
  'contar-lo-cotidiano': contarLoCotidiano,
  'dado-y-turnos': dadoYTurnos,
  'desafio-de-equilibrio': desafioDeEquilibrio,
  'dibujo-a-ciegas': dibujoACiegas,
  'disfraces-con-lo-que-hay': disfracesConLoQueHay,
  'estacion-de-piso': estacionDePiso,
  'final-con-aviso': finalConAviso,
  'flota-o-se-hunde': flotaOSeHunde,
  'huerta-en-macetas': huertaEnMacetas,
  'juegos-de-patio-de-siempre': juegosDePatioDeSiempre,
  'leer-con-preguntas': leerConPreguntas,
  'mesa-sin-pantallas': mesaSinPantallas,
  'musica-y-movimiento': musicaYMovimiento,
  'naipes-y-memotest': naipesYMemotest,
  'panza-al-piso-con-espejo': panzaAlPisoConEspejo,
  'preguntas-de-la-semana': preguntasDeLaSemana,
  'respirar-soplando-velitas': respirarSoplandoVelitas,
  'rutina-para-dormir': rutinaParaDormir,
  'semaforo-de-la-calma': semaforoDeLaCalma,
  'teatro-de-sombras': teatroDeSombras,
  'video-familiar': videoFamiliar,
};

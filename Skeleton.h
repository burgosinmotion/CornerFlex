/*******************************************************************/
/*                                                                 */
/*                      ADOBE CONFIDENTIAL                         */
/*                   _ _ _ _ _ _ _ _ _ _ _ _ _                     */
/*                                                                 */
/* Copyright 2007-2023 Adobe Inc.                                  */
/* All Rights Reserved.                                            */
/*                                                                 */
/* NOTICE:  All information contained herein is, and remains the   */
/* property of Adobe Inc. and its suppliers, if                    */
/* any.  The intellectual and technical concepts contained         */
/* herein are proprietary to Adobe Inc. and its                    */
/* suppliers and may be covered by U.S. and Foreign Patents,       */
/* patents in process, and are protected by trade secret or        */
/* copyright law.  Dissemination of this information or            */
/* reproduction of this material is strictly forbidden unless      */
/* prior written permission is obtained from Adobe Inc.            */
/* Incorporated.                                                   */
/*                                                                 */
/*******************************************************************/

/*
	Skeleton.h
*/

#pragma once

#ifndef SKELETON_H
#define SKELETON_H

typedef unsigned char		u_char;
typedef unsigned short		u_short;
typedef unsigned short		u_int16;
typedef unsigned long		u_long;
typedef short int			int16;
#define PF_TABLE_BITS	12
#define PF_TABLE_SZ_16	4096

#define PF_DEEP_COLOR_AWARE 1	// make sure we get 16bpc pixels; 
								// AE_Effect.h checks for this.

#include "AEConfig.h"

#ifdef AE_OS_WIN
	typedef unsigned short PixelType;
	#include <Windows.h>
#endif

#include "entry.h"
#include "AE_Effect.h"
#include "AE_EffectCB.h"
#include "AE_Macros.h"
#include "Param_Utils.h"
#include "AE_EffectCBSuites.h"
#include "String_Utils.h"
#include "AE_GeneralPlug.h"
#include "AEFX_ChannelDepthTpl.h"
#include "AEGP_SuiteHandler.h"

#include "Skeleton_Strings.h"

/* Versioning information */

#define	MAJOR_VERSION	1
#define	MINOR_VERSION	1
#define	BUG_VERSION		0
#define	STAGE_VERSION	PF_Stage_DEVELOP
#define	BUILD_VERSION	1

#define CF_TARGET_STATE_VERSION_MATCH_NAME		"Target State Version"
#define CF_TARGET_IDENTITY_VALID_MATCH_NAME		"Target Identity Valid"
#define CF_TARGET_LAYER_ID_MATCH_NAME			"Target Layer ID"
#define CF_TARGET_UNIQUE_STREAM_ID_MATCH_NAME	"Target Unique Stream ID"

#define CF_GEOMETRY_TARGET_STATE_VERSION		1

/* Parameter IDs */

	enum {
		CORNERFLEX_INPUT = 0,
		CORNERFLEX_LINK_TRIM,
		CORNERFLEX_TRIM,
		CORNERFLEX_TRIM_LEFT,
		CORNERFLEX_TRIM_TOP,
		CORNERFLEX_TRIM_RIGHT,
		CORNERFLEX_TRIM_BOTTOM,
		CORNERFLEX_TARGET_STATE_VERSION,
		CORNERFLEX_TARGET_IDENTITY_VALID,
		CORNERFLEX_TARGET_LAYER_ID,
		CORNERFLEX_TARGET_UNIQUE_STREAM_ID,
		CORNERFLEX_NUM_PARAMS
	};

	enum {
		LINK_TRIM_DISK_ID = 1,
		TRIM_DISK_ID,
		TRIM_LEFT_DISK_ID,
		TRIM_TOP_DISK_ID,
		TRIM_RIGHT_DISK_ID,
		TRIM_BOTTOM_DISK_ID,
		TARGET_STATE_VERSION_DISK_ID = 7,
		TARGET_IDENTITY_VALID_DISK_ID,
		TARGET_LAYER_ID_DISK_ID,
		TARGET_UNIQUE_STREAM_ID_DISK_ID
	};

	typedef struct {
		PF_Boolean linkTrim;

		PF_FpLong trimLeft;
		PF_FpLong trimTop;
		PF_FpLong trimRight;
		PF_FpLong trimBottom;
	} CornerFlexSettings;

	typedef struct
	{
		PF_FpLong left;
		PF_FpLong top;
		PF_FpLong right;
		PF_FpLong bottom;

	} CF_Rect;

	typedef struct
	{
		CF_Rect bounds;
		PF_FpLong width;
		PF_FpLong height;
		PF_FpLong centerX;
		PF_FpLong centerY;

	} CF_RectangleGeometry;

	typedef struct
	{
		PF_FpLong topLeft;
		PF_FpLong topRight;
		PF_FpLong bottomRight;
		PF_FpLong bottomLeft;

	} CF_CornerRadii;

	// May include Rectangle Path, Bézier Path, and other geometry sources in the future.
	typedef enum
	{
		CF_GEOMETRY_SOURCE_LAYER_BOUNDS = 0,
		CF_GEOMETRY_SOURCE_RECTANGLE

	} CF_GeometrySource;

	typedef enum
	{
		CF_PRIMITIVE_UNKNOWN = 0,
		CF_PRIMITIVE_RECTANGLE,
		CF_PRIMITIVE_ELLIPSE,
		CF_PRIMITIVE_BEZIER,
		CF_PRIMITIVE_POLYGON,
		CF_PRIMITIVE_STAR,
		CF_PRIMITIVE_CUSTOM_PATH

	} CF_PrimitiveType;

	// Serializable identity captured by the After Effects integration layer.
	typedef struct
	{
		A_Boolean isValid;
		AEGP_LayerIDVal layerId;
		int32_t uniqueStreamId;

	} CF_GeometryTargetIdentity;

	// Versioned, pointer-free payload for a future per-instance transport channel.
	typedef struct
	{
		A_long version;
		CF_GeometryTargetIdentity targetIdentity;

	} CF_GeometryTargetState;

	typedef struct
	{
		A_Boolean wasFound;
		A_Boolean isRectanglePath;
		int32_t uniqueStreamId;

	} CF_GeometryTargetLocation;

	typedef struct
	{
		CF_Rect bounds;
		A_Boolean isAvailable;

	} CF_RectangleSourceData;

	typedef struct
	{
		A_long inputWidth;
		A_long inputHeight;
		CF_RectangleSourceData rectangleSource;

	} CF_GeometryResolveRequest;

	typedef struct
	{
		CF_Rect bounds;
		CF_GeometrySource source;
		CF_PrimitiveType primitiveType;
		A_Boolean isFallback;

	} CF_GeometrySourceData;

	typedef struct
	{
		CF_Rect geometryBounds;
		CF_RectangleGeometry rectangleGeometry;
		CF_CornerRadii cornerRadii;
		CF_GeometrySource source;
		CF_PrimitiveType primitiveType;
		A_Boolean isFallback;

	} CF_GeometryContext;

	typedef struct
	{
		CF_Rect geometryBounds;

		A_long inputWidth;
		A_long inputHeight;

	} CF_RenderContext;

	// Resolves the current Layer Bounds fallback before context construction.
	CF_GeometrySourceData
	ResolveLayerBoundsGeometry(
		A_long inputWidth,
		A_long inputHeight);

	// Resolves an available rectangle source without accessing the host.
	CF_GeometrySourceData
	ResolveRectangleGeometry(
		const CF_RectangleSourceData& rectangleSource);

	// Common entry point for geometry source resolution.
	CF_GeometrySourceData
	ResolveGeometrySource(
		const CF_GeometryResolveRequest& request);

	// Builds an immutable rectangle description from resolved bounds.
	CF_RectangleGeometry
	BuildRectangleGeometry(
		const CF_Rect& bounds);

	// Validates geometry data without modifying it or accessing the host.
	A_Boolean
	IsGeometryContextValid(
		const CF_GeometryContext& geometryContext);

	// Applies resolved Trim settings to geometry without rendering.
	CF_GeometryContext
	ExecuteTrimOperation(
		CF_GeometryContext geometryContext,
		const CornerFlexSettings& settings);

	// Coordinates geometry operations without accessing the renderer or host.
	CF_GeometryContext
	ExecuteGeometryPipeline(
		CF_GeometryContext geometryContext,
		const CornerFlexSettings& settings);

	CF_RenderContext
	BuildRenderContext(
		const CF_GeometryContext& geometryContext,
		A_long inputWidth,
		A_long inputHeight);

	CF_GeometryTargetState
	ReadGeometryTargetState(
		PF_ParamDef* params[]);


extern "C" {

	DllExport
	PF_Err
	EffectMain(
		PF_Cmd			cmd,
		PF_InData		*in_data,
		PF_OutData		*out_data,
		PF_ParamDef		*params[],
		PF_LayerDef		*output,
		void			*extra);

}

#endif // SKELETON_H
